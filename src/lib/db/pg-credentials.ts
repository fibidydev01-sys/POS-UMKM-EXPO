/**
 * pg-credentials.ts — METADATA kredensial PG (tabel pg_credentials).
 *
 * PENTING: tabel ini TIDAK menyimpan secret. Secret asli ada di SecureStore.
 * Kolom has_secret hanya penanda bahwa secret tersimpan di Keychain/Keystore.
 */
import { getDb } from './database';
import type { PGProvider, PGMode } from '../pg/types';

export interface PgCredMeta {
  provider: PGProvider;
  mode: PGMode;
  is_active: number;   // 0 | 1
  has_secret: number;  // 0 | 1
  label: string;
  updated_at: string;
}

export async function getPgCredsAll(): Promise<PgCredMeta[]> {
  const db = getDb();
  return db.getAllAsync<PgCredMeta>(
    `SELECT provider, mode, is_active, has_secret, label, updated_at
     FROM pg_credentials ORDER BY provider ASC`
  );
}

export async function getPgMeta(provider: PGProvider): Promise<PgCredMeta | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PgCredMeta>(
    `SELECT provider, mode, is_active, has_secret, label, updated_at
     FROM pg_credentials WHERE provider = ?`,
    [provider]
  );
  return row ?? null;
}

/** Provider yang sedang aktif (maksimal satu). */
export async function getPgAktif(): Promise<PgCredMeta | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PgCredMeta>(
    `SELECT provider, mode, is_active, has_secret, label, updated_at
     FROM pg_credentials WHERE is_active = 1 LIMIT 1`
  );
  return row ?? null;
}

/** Upsert metadata setelah secret disimpan ke SecureStore. */
export async function upsertPgMeta(
  provider: PGProvider,
  mode: PGMode,
  hasSecret: boolean,
  label: string
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO pg_credentials (provider, mode, is_active, has_secret, label, updated_at)
     VALUES (?, ?, 0, ?, ?, datetime('now','localtime'))
     ON CONFLICT(provider) DO UPDATE SET
       mode = excluded.mode,
       has_secret = excluded.has_secret,
       label = excluded.label,
       updated_at = excluded.updated_at`,
    [provider, mode, hasSecret ? 1 : 0, label]
  );
}

export async function setPgMode(provider: PGProvider, mode: PGMode): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE pg_credentials SET mode = ?, updated_at = datetime('now','localtime') WHERE provider = ?`,
    [mode, provider]
  );
}

/** Aktifkan satu provider (nonaktifkan lainnya — hanya satu boleh aktif). */
export async function aktifkanProvider(provider: PGProvider): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE pg_credentials SET is_active = 0`);
    await db.runAsync(
      `UPDATE pg_credentials SET is_active = 1, updated_at = datetime('now','localtime')
       WHERE provider = ?`,
      [provider]
    );
  });
}

export async function nonaktifkanProvider(provider: PGProvider): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE pg_credentials SET is_active = 0 WHERE provider = ?`, [provider]);
}

/** Hapus metadata (dipakai saat hapus kredensial; secret dihapus terpisah). */
export async function hapusPgMeta(provider: PGProvider): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM pg_credentials WHERE provider = ?`, [provider]);
}
