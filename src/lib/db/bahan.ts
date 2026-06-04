/**
 * bahan.ts — manajemen BAHAN baku (ingredient) terpusat (migration v4).
 *
 * Mirror pola lib/db/stock.ts, dengan beda penting:
 *   - qty REAL (bahan bisa 0.5 kg, 150 ml, dst).
 *   - stok BOLEH MINUS (keputusan: warung tetap bisa jualan walau bahan habis di
 *     sistem). decrementBahan TIDAK clamp ke 0 — berbeda dari decrementStock produk.
 *
 * Semua mutasi WAJIB lewat sini agar bahan.stok & bahan_log selalu sinkron
 * (ditulis dalam 1 transaksi) dan ada jejak audit.
 *
 * Jenis mutasi (bahan_log.type):
 *   'in'     → restock / barang masuk (qty positif)
 *   'out'    → konsumsi penjualan     (qty negatif)
 *   'opname' → set fisik              (qty = selisih, bisa +/-)
 */
import type { Bahan, BahanLog } from './database';
import { getDb } from './database';

export interface BahanInput {
  nama: string;
  satuan: string;
  stok: number;       // stok awal
  min_stock: number;
  harga_beli: number;
}

export interface BahanReportRow {
  id: number;
  nama: string;
  satuan: string;
  stok: number;
  min_stock: number;
  harga_beli: number;
  nilai: number;          // harga_beli * stok (boleh negatif jika stok minus)
  menipis: boolean;       // stok <= min_stock
  habis: boolean;         // stok <= 0
}

export interface BahanReport {
  items: BahanReportRow[];
  totalNilai: number;
  totalSku: number;
  jumlahMenipis: number;  // termasuk habis
  jumlahHabis: number;
}

const COLS = `id, nama, satuan, stok, min_stock, harga_beli, is_deleted, created_at`;

// ── CRUD ──

export async function getBahanList(): Promise<Bahan[]> {
  const db = getDb();
  return db.getAllAsync<Bahan>(
    `SELECT ${COLS} FROM bahan WHERE is_deleted = 0 ORDER BY nama ASC`
  );
}

export async function getBahanById(id: number): Promise<Bahan | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Bahan>(`SELECT ${COLS} FROM bahan WHERE id = ?`, [id]);
  return row ?? null;
}

/** Tambah bahan baru. Stok awal > 0 dicatat ke bahan_log (type 'in'). */
export async function tambahBahan(input: BahanInput): Promise<number> {
  const db = getDb();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO bahan (nama, satuan, stok, min_stock, harga_beli)
       VALUES (?, ?, ?, ?, ?)`,
      [input.nama, input.satuan, input.stok, input.min_stock, input.harga_beli]
    );
    newId = res.lastInsertRowId as number;
    if (input.stok > 0) {
      await db.runAsync(
        `INSERT INTO bahan_log (bahan_id, type, qty, stok_sebelum, stok_sesudah, note)
         VALUES (?, 'in', ?, 0, ?, 'Stok awal bahan')`,
        [newId, input.stok, input.stok]
      );
    }
  });
  return newId;
}

/**
 * Update bahan. Bila stok diubah lewat form, selisihnya dicatat 'opname'.
 * (Mengubah satuan/harga tidak menghasilkan log.)
 */
export async function updateBahan(id: number, input: BahanInput): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    const lama = await db.getFirstAsync<{ stok: number }>(`SELECT stok FROM bahan WHERE id = ?`, [id]);
    const stokLama = lama?.stok ?? 0;

    await db.runAsync(
      `UPDATE bahan SET nama = ?, satuan = ?, stok = ?, min_stock = ?, harga_beli = ? WHERE id = ?`,
      [input.nama, input.satuan, input.stok, input.min_stock, input.harga_beli, id]
    );

    if (input.stok !== stokLama) {
      const selisih = input.stok - stokLama;
      await db.runAsync(
        `INSERT INTO bahan_log (bahan_id, type, qty, stok_sebelum, stok_sesudah, note)
         VALUES (?, 'opname', ?, ?, ?, 'Penyesuaian via edit bahan')`,
        [id, selisih, stokLama, input.stok]
      );
    }
  });
}

/** Soft delete bahan. Resep yang memakainya ikut terhapus (FK ON DELETE CASCADE)
 *  hanya bila baris bahan benar-benar DIHAPUS; karena ini soft delete, resep
 *  TIDAK otomatis hilang. Kita bersihkan resep terkait secara eksplisit agar
 *  menu tidak mengonsumsi bahan yang sudah "dihapus". */
export async function hapusBahan(id: number): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE bahan SET is_deleted = 1 WHERE id = ?`, [id]);
    await db.runAsync(`DELETE FROM resep WHERE bahan_id = ?`, [id]);
  });
}

// ── Mutasi stok bahan ──

/** Restock bahan. qty > 0. Kembalikan stok terbaru. */
export async function incrementBahan(bahanId: number, qty: number, note?: string): Promise<number> {
  if (qty <= 0) throw new Error('Qty restock bahan harus lebih dari 0.');
  const db = getDb();
  let stokBaru = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(`SELECT stok FROM bahan WHERE id = ?`, [bahanId]);
    const sebelum = row?.stok ?? 0;
    stokBaru = sebelum + qty;
    await db.runAsync(`UPDATE bahan SET stok = ? WHERE id = ?`, [stokBaru, bahanId]);
    await db.runAsync(
      `INSERT INTO bahan_log (bahan_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'in', ?, ?, ?, ?)`,
      [bahanId, qty, sebelum, stokBaru, note ?? 'Bahan masuk']
    );
  });
  return stokBaru;
}

/**
 * Kurangi stok bahan (konsumsi penjualan). qty > 0.
 * TIDAK clamp — stok boleh jadi MINUS (sesuai kebutuhan UMKM). bahan_log mencatat
 * qty keluar sebenarnya (negatif). Kembalikan stok terbaru.
 */
export async function decrementBahan(bahanId: number, qty: number, note?: string): Promise<number> {
  if (qty <= 0) return getStokBahan(bahanId);
  const db = getDb();
  let stokBaru = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(`SELECT stok FROM bahan WHERE id = ?`, [bahanId]);
    const sebelum = row?.stok ?? 0;
    stokBaru = sebelum - qty; // boleh minus
    await db.runAsync(`UPDATE bahan SET stok = ? WHERE id = ?`, [stokBaru, bahanId]);
    await db.runAsync(
      `INSERT INTO bahan_log (bahan_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'out', ?, ?, ?, ?)`,
      [bahanId, -qty, sebelum, stokBaru, note ?? 'Konsumsi penjualan']
    );
  });
  return stokBaru;
}

/** Opname bahan: set stok ke hasil hitung fisik (boleh 0, tidak boleh < 0 di input). */
export async function opnameBahan(
  bahanId: number,
  stokFisik: number,
  note?: string
): Promise<{ selisih: number; stokBaru: number }> {
  const fisik = Math.max(0, stokFisik);
  const db = getDb();
  let selisih = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ stok: number }>(`SELECT stok FROM bahan WHERE id = ?`, [bahanId]);
    const sebelum = row?.stok ?? 0;
    selisih = fisik - sebelum;
    await db.runAsync(`UPDATE bahan SET stok = ? WHERE id = ?`, [fisik, bahanId]);
    await db.runAsync(
      `INSERT INTO bahan_log (bahan_id, type, qty, stok_sebelum, stok_sesudah, note)
       VALUES (?, 'opname', ?, ?, ?, ?)`,
      [bahanId, selisih, sebelum, fisik, note ?? 'Opname bahan (hitung fisik)']
    );
  });
  return { selisih, stokBaru: fisik };
}

async function getStokBahan(bahanId: number): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ stok: number }>(`SELECT stok FROM bahan WHERE id = ?`, [bahanId]);
  return row?.stok ?? 0;
}

// ── Laporan ──

/** Laporan stok bahan + nilai stok (harga_beli × stok). */
export async function getBahanReport(): Promise<BahanReport> {
  const db = getDb();
  const rows = await db.getAllAsync<{
    id: number; nama: string; satuan: string; stok: number; min_stock: number; harga_beli: number;
  }>(
    `SELECT id, nama, satuan, stok, min_stock, harga_beli
     FROM bahan
     WHERE is_deleted = 0
     ORDER BY (stok <= 0) DESC, (stok <= min_stock) DESC, nama ASC`
  );

  const items: BahanReportRow[] = rows.map((r) => {
    const habis = r.stok <= 0;
    const menipis = r.stok <= r.min_stock;
    return {
      id: r.id,
      nama: r.nama,
      satuan: r.satuan,
      stok: r.stok,
      min_stock: r.min_stock,
      harga_beli: r.harga_beli,
      nilai: r.harga_beli * r.stok,
      menipis,
      habis,
    };
  });

  const totalNilai = items.reduce((s, it) => s + it.nilai, 0);
  const jumlahHabis = items.filter((it) => it.habis).length;
  const jumlahMenipis = items.filter((it) => it.menipis).length;

  return { items, totalNilai, totalSku: items.length, jumlahMenipis, jumlahHabis };
}

/** Riwayat mutasi satu bahan (default 50 terbaru). */
export async function getBahanLog(bahanId: number, limit = 50): Promise<BahanLog[]> {
  const db = getDb();
  return db.getAllAsync<BahanLog>(
    `SELECT id, bahan_id, type, qty, stok_sebelum, stok_sesudah, note, created_at
     FROM bahan_log WHERE bahan_id = ?
     ORDER BY created_at DESC, id DESC LIMIT ?`,
    [bahanId, limit]
  );
}
