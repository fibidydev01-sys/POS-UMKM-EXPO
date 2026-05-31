/**
 * Akses data preset diskon. Kasir hanya boleh memilih dari preset ini.
 */
import { getDb, DiskonPreset } from './database';

export interface DiskonPresetInput {
  nama: string;
  persen: number;
}

export async function getDiskonPreset(): Promise<DiskonPreset[]> {
  const db = getDb();
  return db.getAllAsync<DiskonPreset>(
    `SELECT id, nama, persen, is_active FROM diskon_preset
     WHERE is_active = 1 ORDER BY persen ASC`
  );
}

export async function tambahDiskonPreset(input: DiskonPresetInput): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO diskon_preset (nama, persen, is_active) VALUES (?, ?, 1)`,
    [input.nama, input.persen]
  );
}

export async function updateDiskonPreset(id: number, input: DiskonPresetInput): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE diskon_preset SET nama = ?, persen = ? WHERE id = ?`,
    [input.nama, input.persen, id]
  );
}

/** Soft delete (nonaktifkan) — transaksi lama yang memakai preset tetap valid. */
export async function hapusDiskonPreset(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE diskon_preset SET is_active = 0 WHERE id = ?`, [id]);
}
