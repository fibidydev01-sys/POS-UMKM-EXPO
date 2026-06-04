/**
 * Akses data menu & kategori.
 *
 * PERUBAHAN (manajemen stok v3):
 *   - SELECT menyertakan kolom stok & min_stock.
 *   - MenuItemInput menerima stok awal & min_stock.
 *   - Saat tambah produk, stok awal dicatat ke stock_log (type 'in') bila > 0.
 *   - Mutasi stok (in/out/opname) ada di lib/db/stock.ts agar terpusat.
 *
 * PERUBAHAN (bahan + resep v4 — HYBRID):
 *   - SELECT & INSERT/UPDATE menyertakan track_mode ('product' | 'recipe').
 *   - MenuItemInput menerima track_mode (default 'product' bila tak diisi).
 *   - Catatan: log stok awal / opname hanya relevan untuk mode 'product'.
 *     Untuk mode 'recipe', kolom stok menu diabaikan (stok dihitung dari bahan),
 *     tetapi nilainya tetap ditulis apa adanya agar tidak ada perilaku tersembunyi.
 */
import type { Kategori, MenuItem, TrackMode } from './database';
import { getDb } from './database';

export interface MenuItemInput {
  nama: string;
  harga: number;
  kategori_id: number | null;
  is_available: number;
  stok: number;
  min_stock: number;
  /** Mode pelacakan stok. Opsional; default 'product'. */
  track_mode?: TrackMode;
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
const MENU_COLS = `id, nama, harga, kategori_id, is_available, created_at, stok, min_stock, track_mode`;

function normalMode(m?: TrackMode): TrackMode {
  return m === 'recipe' ? 'recipe' : 'product';
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const db = getDb();
  return db.getAllAsync<MenuItem>(
    `SELECT ${MENU_COLS}
     FROM menu_item WHERE is_deleted = 0
     ORDER BY nama ASC`
  );
}

/** Hanya yang tersedia dijual (untuk kasir). */
export async function getMenuTersedia(): Promise<MenuItem[]> {
  const db = getDb();
  return db.getAllAsync<MenuItem>(
    `SELECT ${MENU_COLS}
     FROM menu_item WHERE is_deleted = 0 AND is_available = 1
     ORDER BY nama ASC`
  );
}

export async function getMenuById(id: number): Promise<MenuItem | null> {
  const db = getDb();
  const row = await db.getFirstAsync<MenuItem>(
    `SELECT ${MENU_COLS} FROM menu_item WHERE id = ?`,
    [id]
  );
  return row ?? null;
}

/**
 * Tambah produk baru. Bila stok awal > 0, catat ke stock_log (type 'in').
 * Dibungkus transaksi agar konsisten.
 */
export async function tambahMenuItem(input: MenuItemInput): Promise<number> {
  const db = getDb();
  const mode = normalMode(input.track_mode);
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO menu_item (nama, harga, kategori_id, is_available, stok, min_stock, track_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.nama, input.harga, input.kategori_id, input.is_available, input.stok, input.min_stock, mode]
    );
    newId = res.lastInsertRowId as number;

    // Log stok awal hanya bermakna untuk mode 'product'.
    if (mode === 'product' && input.stok > 0) {
      await db.runAsync(
        `INSERT INTO stock_log (menu_item_id, type, qty, stok_sebelum, stok_sesudah, note)
         VALUES (?, 'in', ?, 0, ?, 'Stok awal produk')`,
        [newId, input.stok, input.stok]
      );
    }
  });
  return newId;
}

/**
 * Update produk. Bila stok diubah lewat form edit (mode 'product'), selisihnya
 * dicatat sebagai 'opname' (penyesuaian manual) agar audit tetap utuh.
 */
export async function updateMenuItem(id: number, input: MenuItemInput): Promise<void> {
  const db = getDb();
  const mode = normalMode(input.track_mode);
  await db.withTransactionAsync(async () => {
    const lama = await db.getFirstAsync<{ stok: number }>(
      `SELECT stok FROM menu_item WHERE id = ?`,
      [id]
    );
    const stokLama = lama?.stok ?? 0;

    await db.runAsync(
      `UPDATE menu_item SET nama = ?, harga = ?, kategori_id = ?, is_available = ?, stok = ?, min_stock = ?, track_mode = ?
       WHERE id = ?`,
      [input.nama, input.harga, input.kategori_id, input.is_available, input.stok, input.min_stock, mode, id]
    );

    if (mode === 'product' && input.stok !== stokLama) {
      const selisih = input.stok - stokLama;
      await db.runAsync(
        `INSERT INTO stock_log (menu_item_id, type, qty, stok_sebelum, stok_sesudah, note)
         VALUES (?, 'opname', ?, ?, ?, 'Penyesuaian via edit produk')`,
        [id, selisih, stokLama, input.stok]
      );
    }
  });
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
