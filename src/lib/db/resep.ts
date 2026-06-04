/**
 * resep.ts — resep / BOM (menu_item → bahan) + konsumsi bahan saat penjualan.
 *
 * Resep aktif hanya untuk menu ber-track_mode 'recipe'. Tiap baris resep =
 * pemakaian 1 bahan per 1 porsi menu (qty REAL, sesuai satuan bahan).
 *
 * konsumsiBahanUntukMenu(menuId, qtyMenu):
 *   INTI fitur. Untuk tiap baris resep menu → kurangi stok bahan sebesar
 *   qtyPerPorsi × qtyMenu (boleh minus), lalu cek notif menipis/habis bahan.
 *   Dipanggil dari prosesStokKeluar (transaksi.ts) untuk menu mode 'recipe'.
 *   Best-effort: tiap bahan dibungkus try sendiri agar satu kegagalan tidak
 *   menghentikan konsumsi bahan lain (konsisten dgn pola prosesStokKeluar).
 */
import type { Bahan, Resep } from './database';
import { getDb } from './database';
import { decrementBahan } from './bahan';
import { checkAndNotifyLowStockBahan } from '../notification/bahan-notif';

/** Baris resep yang sudah digabung dengan info bahan (untuk tampilan editor). */
export interface ResepLine {
  resep_id: number;
  bahan_id: number;
  nama: string;
  satuan: string;
  qty: number;          // qty per porsi
  stok: number;         // stok bahan saat ini (info)
  harga_beli: number;
}

/** Ambil resep sebuah menu, lengkap dengan info bahan. */
export async function getResepByMenu(menuId: number): Promise<ResepLine[]> {
  const db = getDb();
  return db.getAllAsync<ResepLine>(
    `SELECT r.id AS resep_id, r.bahan_id AS bahan_id, b.nama AS nama, b.satuan AS satuan,
            r.qty AS qty, b.stok AS stok, b.harga_beli AS harga_beli
     FROM resep r
     JOIN bahan b ON b.id = r.bahan_id
     WHERE r.menu_item_id = ? AND b.is_deleted = 0
     ORDER BY b.nama ASC`,
    [menuId]
  );
}

/** Versi mentah (tanpa join) — jarang dipakai, untuk keperluan internal. */
export async function getResepRaw(menuId: number): Promise<Resep[]> {
  const db = getDb();
  return db.getAllAsync<Resep>(
    `SELECT id, menu_item_id, bahan_id, qty FROM resep WHERE menu_item_id = ?`,
    [menuId]
  );
}

/**
 * Tambah / perbarui satu baris resep (upsert berdasar UNIQUE(menu, bahan)).
 * qty <= 0 ditolak di pemanggil (UI); di sini kita simpan apa adanya.
 */
export async function setResepLine(menuId: number, bahanId: number, qty: number): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO resep (menu_item_id, bahan_id, qty) VALUES (?, ?, ?)
     ON CONFLICT(menu_item_id, bahan_id) DO UPDATE SET qty = excluded.qty`,
    [menuId, bahanId, qty]
  );
}

export async function hapusResepLine(resepId: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM resep WHERE id = ?`, [resepId]);
}

/** Hapus seluruh resep sebuah menu (mis. saat menu beralih ke mode 'product'). */
export async function hapusSemuaResep(menuId: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM resep WHERE menu_item_id = ?`, [menuId]);
}

/** Bahan yang BELUM ada di resep menu (untuk daftar tambah di editor). */
export async function getBahanBelumDipakai(menuId: number): Promise<Bahan[]> {
  const db = getDb();
  return db.getAllAsync<Bahan>(
    `SELECT id, nama, satuan, stok, min_stock, harga_beli, is_deleted, created_at
     FROM bahan
     WHERE is_deleted = 0
       AND id NOT IN (SELECT bahan_id FROM resep WHERE menu_item_id = ?)
     ORDER BY nama ASC`,
    [menuId]
  );
}

/** Jumlah baris resep sebuah menu (untuk badge "punya resep / belum"). */
export async function countResep(menuId: number): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM resep WHERE menu_item_id = ?`,
    [menuId]
  );
  return row?.n ?? 0;
}

/**
 * INTI: konsumsi bahan untuk penjualan sebuah menu mode 'recipe'.
 * Untuk tiap baris resep → decrementBahan(qtyPerPorsi × qtyMenu) (boleh minus),
 * lalu cek notif bahan. Tidak melempar (best-effort).
 */
export async function konsumsiBahanUntukMenu(
  menuId: number,
  qtyMenu: number,
  nomorOrder: string
): Promise<void> {
  if (qtyMenu <= 0) return;
  let lines: Resep[] = [];
  try {
    lines = await getResepRaw(menuId);
  } catch {
    return;
  }

  for (const line of lines) {
    const totalKeluar = line.qty * qtyMenu;
    if (totalKeluar <= 0) continue;
    try {
      await decrementBahan(line.bahan_id, totalKeluar, `Penjualan ${nomorOrder}`);
      await checkAndNotifyLowStockBahan(line.bahan_id);
    } catch {
      // jangan ganggu alur utama / bahan lain
    }
  }
}
