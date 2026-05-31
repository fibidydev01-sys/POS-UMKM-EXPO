/**
 * Akses data menu & kategori.
 */
import { getDb, Kategori, MenuItem } from './database';

export interface MenuItemInput {
  nama: string;
  harga: number;
  kategori_id: number | null;
  is_available: number;
}

// ── Kategori ──
export async function getKategori(): Promise<Kategori[]> {
  const db = getDb();
  return db.getAllAsync<Kategori>(
    `SELECT id, nama, urutan FROM kategori ORDER BY urutan ASC, nama ASC`
  );
}

export async function tambahKategori(nama: string): Promise<void> {
  const db = getDb();
  const row = await db.getFirstAsync<{ maks: number }>(
    `SELECT COALESCE(MAX(urutan), 0) AS maks FROM kategori`
  );
  const urutan = (row?.maks ?? 0) + 1;
  await db.runAsync(`INSERT INTO kategori (nama, urutan) VALUES (?, ?)`, [nama, urutan]);
}

export async function hapusKategori(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM kategori WHERE id = ?`, [id]);
}

// ── Menu item ──
export async function getMenuItems(): Promise<MenuItem[]> {
  const db = getDb();
  return db.getAllAsync<MenuItem>(
    `SELECT id, nama, harga, kategori_id, is_available, created_at
     FROM menu_item WHERE is_deleted = 0
     ORDER BY nama ASC`
  );
}

/** Hanya yang tersedia dijual (untuk kasir). */
export async function getMenuTersedia(): Promise<MenuItem[]> {
  const db = getDb();
  return db.getAllAsync<MenuItem>(
    `SELECT id, nama, harga, kategori_id, is_available, created_at
     FROM menu_item WHERE is_deleted = 0 AND is_available = 1
     ORDER BY nama ASC`
  );
}

export async function tambahMenuItem(input: MenuItemInput): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO menu_item (nama, harga, kategori_id, is_available)
     VALUES (?, ?, ?, ?)`,
    [input.nama, input.harga, input.kategori_id, input.is_available]
  );
}

export async function updateMenuItem(id: number, input: MenuItemInput): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE menu_item SET nama = ?, harga = ?, kategori_id = ?, is_available = ?
     WHERE id = ?`,
    [input.nama, input.harga, input.kategori_id, input.is_available, id]
  );
}

export async function toggleTersedia(id: number, isAvailable: boolean): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE menu_item SET is_available = ? WHERE id = ?`, [isAvailable ? 1 : 0, id]);
}

/** Soft delete agar riwayat transaksi lama tetap utuh. */
export async function hapusMenuItem(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE menu_item SET is_deleted = 1, is_available = 0 WHERE id = ?`, [id]);
}
