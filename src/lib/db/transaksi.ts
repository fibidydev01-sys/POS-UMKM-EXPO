/**
 * transaksi.ts — simpan transaksi, riwayat, void/refund, dan agregat dashboard.
 *
 * PERUBAHAN (manajemen stok v2):
 *   - Setelah transaksi cash tersimpan, stok produk dikurangi (decrementStock)
 *     dan dicek untuk notifikasi stok menipis/habis (checkAndNotifyLowStock).
 *   - Hanya item 'normal' & 'promo_free' dengan menu_item_id yang mengurangi
 *     stok (item gratis BOGO tetap mengurangi stok fisik karena barang keluar).
 *   - Mutasi stok dilakukan SETELAH commit transaksi penjualan, di luar
 *     withTransactionAsync utama, agar kegagalan stok tidak merollback penjualan
 *     (stok di-clamp & dicatat sendiri di stock_log).
 *
 * Lapis 3 (bahan + resep v4) DIHAPUS:
 *   - Import TrackMode dihapus
 *   - Import konsumsiBahanUntukMenu dihapus
 *   - prosesStokKeluar: query track_mode & branch 'recipe' dihapus
 *   - Semua menu → decrementStock (product only)
 *
 * PERUBAHAN (ROADMAP V1/V2 — gating):
 *   - prosesStokKeluar() jadi NO-OP di V1 (features.inventory == false).
 *   - Satu titik gate ini OTOMATIS berlaku untuk jalur cash & QRIS karena
 *     keduanya memanggil prosesStokKeluar yang sama.
 */
import type { CartItem, PaymentMethod, Transaksi, TransactionItem } from './database';
import { getDb } from './database';
import { hitungGrandTotal } from '../cart/promo-engine';
import { decrementStock } from './stock';
import { checkAndNotifyLowStock } from '../notification/stock-notif';
import { features } from '../config/features';

export interface SimpanTransaksiInput {
  items: CartItem[];
  diskonPresetId: number | null;
  diskonPersen: number;
  paymentMethod: PaymentMethod;
  uangDiterima: number | null;
}

export interface SimpanTransaksiHasil {
  transaksiId: number;
  nomorOrder: string;
}

export interface RingkasanOmzet {
  hariIni: number;
  orderHariIni: number;
  mingguIni: number;
  bulanIni: number;
  orderBulanIni: number;
  refundBulan: number;
  jumlahRefundBulan: number;
  nilaiBogoBulan: number;
  jumlahItemGratisBulan: number;
}

export interface TopProduk {
  nama: string;
  totalQty: number;
  totalOmzet: number;
}

export interface AnalisaDiskon {
  nama: string;
  persen: number;
  jumlahDipakai: number;
  totalDiskon: number;
}

/** Nomor order harian: ORD-YYYYMMDD-NNN (reset tiap hari). */
async function buatNomorOrder(): Promise<string> {
  const db = getDb();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const tgl = `${y}${m}${d}`;
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transaksi WHERE date(created_at) = date('now','localtime')`
  );
  const urut = String((row?.n ?? 0) + 1).padStart(3, '0');
  return `ORD-${tgl}-${urut}`;
}

/**
 * Kurangi stok untuk semua item ber-menu_item_id dalam keranjang, lalu cek
 * notifikasi. Dipanggil setelah transaksi tersimpan. Tidak melempar.
 *
 * GATING V1/V2: bila Inventori tidak aktif (V1), fungsi ini langsung return
 * tanpa menyentuh stok apa pun.
 *
 * V2: semua menu → decrementStock (clamp 0) + checkAndNotifyLowStock.
 * (branch 'recipe' / konsumsiBahanUntukMenu dihapus — product only)
 */
export async function prosesStokKeluar(items: CartItem[], nomorOrder: string): Promise<void> {
  // V1: tidak ada pelacakan stok → lewati total.
  if (!features.inventory) return;

  // Agregasi qty per menu_item_id (gabung baris normal + promo_free menu sama).
  const agg = new Map<number, number>();
  for (const it of items) {
    if (it.menu_item_id == null) continue;
    agg.set(it.menu_item_id, (agg.get(it.menu_item_id) ?? 0) + it.qty);
  }
  if (agg.size === 0) return;

  for (const [menuId, qty] of agg) {
    try {
      await decrementStock(menuId, qty, `Penjualan ${nomorOrder}`);
      await checkAndNotifyLowStock(menuId);
    } catch {
      // jangan ganggu alur utama
    }
  }
}

export async function simpanTransaksi(input: SimpanTransaksiInput): Promise<SimpanTransaksiHasil> {
  const db = getDb();
  const { subtotal, diskonNominal, grandTotal } = hitungGrandTotal(input.items, input.diskonPersen);

  const uang = input.uangDiterima;
  const kembalian = uang != null && uang >= grandTotal ? uang - grandTotal : null;
  const nomorOrder = await buatNomorOrder();

  let transaksiId = 0;

  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO transaksi
        (nomor_order, subtotal, diskon_preset_id, diskon_persen, diskon_nominal,
         grand_total, payment_method, uang_diterima, kembalian, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        nomorOrder, subtotal, input.diskonPresetId, input.diskonPersen, diskonNominal,
        grandTotal, input.paymentMethod, uang, kembalian,
      ]
    );
    transaksiId = res.lastInsertRowId as number;

    for (const it of input.items) {
      const tipe = it.item_type === 'promo_free' ? 'promo_free' : 'normal';
      const sub = tipe === 'promo_free' ? 0 : it.harga_satuan * it.qty;
      await db.runAsync(
        `INSERT INTO transaction_item
          (transaksi_id, menu_item_id, nama_produk, harga_satuan, qty, subtotal, item_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [transaksiId, it.menu_item_id, it.nama_produk, it.harga_satuan, it.qty, sub, tipe]
      );
    }
  });

  // Stok keluar + notifikasi DI LUAR transaksi penjualan (tidak merollback penjualan).
  // No-op otomatis di V1 (lihat prosesStokKeluar).
  await prosesStokKeluar(input.items, nomorOrder);

  return { transaksiId, nomorOrder };
}

export async function getTransaksiById(id: number): Promise<Transaksi | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Transaksi>(`SELECT * FROM transaksi WHERE id = ?`, [id]);
  return row ?? null;
}

export async function getItemsByTransaksi(transaksiId: number): Promise<TransactionItem[]> {
  const db = getDb();
  return db.getAllAsync<TransactionItem>(
    `SELECT * FROM transaction_item WHERE transaksi_id = ? ORDER BY id ASC`,
    [transaksiId]
  );
}

export async function getRiwayat(limit = 200): Promise<Transaksi[]> {
  const db = getDb();
  return db.getAllAsync<Transaksi>(
    `SELECT * FROM transaksi ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit]
  );
}

export async function voidTransaksi(id: number, reason = 'Dibatalkan kasir'): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE transaksi SET status = 'void', void_reason = ? WHERE id = ?`,
    [reason, id]
  );
}

export async function refundTransaksi(id: number, alasan: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE transaksi SET status = 'refund', void_reason = ? WHERE id = ?`,
    [alasan, id]
  );
}

// ───────────────────────── Agregat Dashboard ─────────────────────────

export async function getRingkasanOmzet(): Promise<RingkasanOmzet> {
  const db = getDb();

  const omzet = async (clause: string): Promise<{ total: number; n: number }> => {
    const r = await db.getFirstAsync<{ total: number | null; n: number }>(
      `SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS n
       FROM transaksi WHERE status = 'completed' AND ${clause}`
    );
    return { total: r?.total ?? 0, n: r?.n ?? 0 };
  };

  const hari = await omzet(`date(created_at) = date('now','localtime')`);
  const minggu = await omzet(`date(created_at) >= date('now','localtime','-6 days')`);
  const bulan = await omzet(`strftime('%Y-%m', created_at) = strftime('%Y-%m','now','localtime')`);

  const refund = await db.getFirstAsync<{ total: number | null; n: number }>(
    `SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS n
     FROM transaksi
     WHERE status = 'refund'
       AND strftime('%Y-%m', created_at) = strftime('%Y-%m','now','localtime')`
  );

  const bogo = await db.getFirstAsync<{ nilai: number | null; qty: number | null }>(
    `SELECT COALESCE(SUM(ti.harga_satuan * ti.qty),0) AS nilai,
            COALESCE(SUM(ti.qty),0) AS qty
     FROM transaction_item ti
     JOIN transaksi t ON t.id = ti.transaksi_id
     WHERE ti.item_type = 'promo_free' AND t.status = 'completed'
       AND strftime('%Y-%m', t.created_at) = strftime('%Y-%m','now','localtime')`
  );

  return {
    hariIni: hari.total,
    orderHariIni: hari.n,
    mingguIni: minggu.total,
    bulanIni: bulan.total,
    orderBulanIni: bulan.n,
    refundBulan: refund?.total ?? 0,
    jumlahRefundBulan: refund?.n ?? 0,
    nilaiBogoBulan: bogo?.nilai ?? 0,
    jumlahItemGratisBulan: bogo?.qty ?? 0,
  };
}

export async function getTopProduk(limit = 5): Promise<TopProduk[]> {
  const db = getDb();
  return db.getAllAsync<TopProduk>(
    `SELECT ti.nama_produk AS nama,
            SUM(ti.qty) AS totalQty,
            SUM(ti.subtotal) AS totalOmzet
     FROM transaction_item ti
     JOIN transaksi t ON t.id = ti.transaksi_id
     WHERE t.status = 'completed' AND ti.item_type = 'normal'
       AND strftime('%Y-%m', t.created_at) = strftime('%Y-%m','now','localtime')
     GROUP BY ti.nama_produk
     ORDER BY totalQty DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getAnalisaDiskon(): Promise<AnalisaDiskon[]> {
  const db = getDb();
  return db.getAllAsync<AnalisaDiskon>(
    `SELECT dp.nama AS nama,
            dp.persen AS persen,
            COUNT(t.id) AS jumlahDipakai,
            COALESCE(SUM(t.diskon_nominal),0) AS totalDiskon
     FROM diskon_preset dp
     JOIN transaksi t ON t.diskon_preset_id = dp.id AND t.status = 'completed'
     WHERE strftime('%Y-%m', t.created_at) = strftime('%Y-%m','now','localtime')
     GROUP BY dp.id
     HAVING jumlahDipakai > 0
     ORDER BY totalDiskon DESC`
  );
}
