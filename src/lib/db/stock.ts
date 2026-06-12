/**
 * stock.ts — manajemen stok terpusat.
 *
 * Semua mutasi stok WAJIB lewat sini agar:
 *   1. menu_item.stok dan stock_log selalu sinkron (ditulis dalam 1 transaksi).
 *   2. ada jejak audit (stok_sebelum / stok_sesudah) untuk tiap pergerakan.
 *
 * Jenis mutasi:
 *   - incrementStock : barang masuk / restock (type 'in')
 *   - decrementStock : terjual / keluar       (type 'out')
 *   - opnameStock    : set stok fisik         (type 'opname', qty = selisih)
 *
 * Catatan stok minus:
 *   decrementStock meng-CLAMP stok minimum ke 0 (UMKM jarang mau stok minus).
 *   Tapi stock_log tetap mencatat qty keluar apa adanya untuk audit penjualan.
 */
import type { MenuItem, StockLog } from './database';
import { getDb } from './database';

export interface StockReportRow {
  id: number;
  nama: string;
  stok: number;
  min_stock: number;
  harga: number;
  nilai: number;          // harga * stok
  is_available: number;
  menipis: boolean;       // stok <= min_stock
  habis: boolean;         // stok <= 0
}

export interface StockReport {
  items: StockReportRow[];
  totalNilai: number;     // total seluruh nilai stok (Rp)
  totalSku: number;       // jumlah produk dilacak
  jumlahMenipis: number;  // produk dengan stok <= min_stock (termasuk habis)
  jumlahHabis: number;    // produk dengan stok <= 0
}

/** Naikkan stok (restock). qty harus > 0. Kembalikan stok terbaru. */
export async function incrementStock(
  menuId: number,
  qty: number,
  note?: string
): Promise<number> {
  if (qty <= 0) throw new Error('Qty restock harus lebih dari 0.');
  const db = getDb();
  let stokBaru = 0;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(
      `SELECT stok FROM menu_item WHERE id = ?`,
      [menuId]
    );
    const sebelum = row?.stok ?? 0;
    stokBaru = sebelum + qty;

    await db.runAsync(`UPDATE menu_item SET stok = ? WHERE id = ?`, [stokBaru, menuId]);
    await db.runAsync(
      `INSERT INTO stock_log (menu_item_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'in', ?, ?, ?, ?)`,
      [menuId, qty, sebelum, stokBaru, note ?? 'Stok masuk']
    );
  });

  return stokBaru;
}

/**
 * Kurangi stok (penjualan). qty harus > 0.
 * Stok di-CLAMP ke minimum 0. stock_log mencatat qty keluar sebenarnya (negatif).
 * Kembalikan stok terbaru.
 */
export async function decrementStock(
  menuId: number,
  qty: number,
  note?: string
): Promise<number> {
  if (qty <= 0) return getStokSaatIni(menuId);
  const db = getDb();
  let stokBaru = 0;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(
      `SELECT stok FROM menu_item WHERE id = ?`,
      [menuId]
    );
    const sebelum = row?.stok ?? 0;
    stokBaru = Math.max(0, sebelum - qty);

    await db.runAsync(`UPDATE menu_item SET stok = ? WHERE id = ?`, [stokBaru, menuId]);
    await db.runAsync(
      `INSERT INTO stock_log (menu_item_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'out', ?, ?, ?, ?)`,
      [menuId, -qty, sebelum, stokBaru, note ?? 'Stok keluar (penjualan)']
    );
  });

  return stokBaru;
}

/**
 * Set stok ke hasil hitung fisik (opname). stokFisik adalah angka absolut.
 * Selisih (stokFisik - stokLama) dicatat sebagai mutasi 'opname'.
 * Kembalikan { selisih, stokBaru }.
 */
export async function opnameStock(
  menuId: number,
  stokFisik: number,
  note?: string
): Promise<{ selisih: number; stokBaru: number }> {
  const fisik = Math.max(0, Math.round(stokFisik));
  const db = getDb();
  let selisih = 0;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(
      `SELECT stok FROM menu_item WHERE id = ?`,
      [menuId]
    );
    const sebelum = row?.stok ?? 0;
    selisih = fisik - sebelum;

    await db.runAsync(`UPDATE menu_item SET stok = ? WHERE id = ?`, [fisik, menuId]);
    await db.runAsync(
      `INSERT INTO stock_log (menu_item_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'opname', ?, ?, ?, ?)`,
      [menuId, selisih, sebelum, fisik, note ?? 'Stok opname (hitung fisik)']
    );
  });

  return { selisih, stokBaru: fisik };
}

async function getStokSaatIni(menuId: number): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ stok: number }>(
    `SELECT stok FROM menu_item WHERE id = ?`,
    [menuId]
  );
  return row?.stok ?? 0;
}

/** Set ambang minimum stok untuk satu produk. */
export async function setMinStock(menuId: number, minStock: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE menu_item SET min_stock = ? WHERE id = ?`, [Math.max(0, minStock), menuId]);
}

/** Laporan stok lengkap + nilai stok (harga × jumlah). */
export async function getStockReport(): Promise<StockReport> {
  const db = getDb();
  const rows = await db.getAllAsync<{
    id: number; nama: string; stok: number; min_stock: number; harga: number; is_available: number;
  }>(
    `SELECT id, nama, stok, min_stock, harga, is_available
     FROM menu_item
     WHERE is_deleted = 0
     ORDER BY (stok <= 0) DESC, (stok <= min_stock) DESC, nama ASC`
  );

  const items: StockReportRow[] = rows.map((r) => {
    const habis = r.stok <= 0;
    const menipis = r.stok <= r.min_stock;
    return {
      id: r.id,
      nama: r.nama,
      stok: r.stok,
      min_stock: r.min_stock,
      harga: r.harga,
      nilai: r.harga * r.stok,
      is_available: r.is_available,
      menipis,
      habis,
    };
  });

  const totalNilai = items.reduce((s, it) => s + it.nilai, 0);
  const jumlahHabis = items.filter((it) => it.habis).length;
  const jumlahMenipis = items.filter((it) => it.menipis).length;

  return {
    items,
    totalNilai,
    totalSku: items.length,
    jumlahMenipis,
    jumlahHabis,
  };
}

/** Produk yang stoknya menipis (<= min_stock), untuk reminder & badge. */
export async function getProdukMenipis(): Promise<MenuItem[]> {
  const db = getDb();
  return db.getAllAsync<MenuItem>(
    `SELECT id, nama, harga, kategori_id, is_available, created_at, stok, min_stock
     FROM menu_item
     WHERE is_deleted = 0 AND stok <= min_stock
     ORDER BY stok ASC, nama ASC`
  );
}

/** Riwayat mutasi stok untuk satu produk (default 50 entri terbaru). */
export async function getStockLog(menuId: number, limit = 50): Promise<StockLog[]> {
  const db = getDb();
  return db.getAllAsync<StockLog>(
    `SELECT id, menu_item_id, type, qty, stok_sebelum, stok_sesudah, note, created_at
     FROM stock_log
     WHERE menu_item_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [menuId, limit]
  );
}
