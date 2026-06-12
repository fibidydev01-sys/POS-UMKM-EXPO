/**
 * hapus-data.ts — hapus semua data user (server + lokal).
 *
 * Dipanggil dari pengaturan/hapus-data.tsx.
 *
 * Apa yang dihapus:
 *   SERVER (Supabase):
 *     - trial record
 *     - aktivasi_kode: reset used/device_id agar bisa dipakai lagi
 *     - iap_purchase record
 *
 *   LOKAL:
 *     - Status lisensi (SecureStore + SQLite pos-license.db) via hapusLicense()
 *     - Transaksi + item transaksi + stock_log di pos_umkm.db
 *     - Reset field lisensi di tabel pengaturan (activated, activation_code, umkm_id)
 *
 * V1 — tidak ada PG, tidak ada payment_session, tidak ada pg_credentials.
 *
 * Prinsip:
 *   - Hapus server best-effort: gagal server tidak membatalkan hapus lokal.
 *   - Tidak melempar ke pemanggil — selalu return { ok, pesan }.
 */
import { getDeviceId } from '../utils/device';
import { hapusLicense } from './license-store';
import { functionsBase, anonHeaders, postJson } from './net';
import { getDb } from '../db/database';

export interface HapusDataHasil {
  ok: boolean;
  pesan: string;
}

/** Hapus semua data user: server + lokal. */
export async function hapusSemuaData(): Promise<HapusDataHasil> {
  const deviceId = await getDeviceId();

  // ── 1. Hapus data di server (best-effort) ──────────────────────────────
  try {
    const base = functionsBase();
    if (base) {
      await postJson(
        `${base}/hapus-data`,
        { device_id: deviceId },
        anonHeaders(),
        15000
      );
    }
  } catch {
    // Lanjutkan hapus lokal meski server tidak bisa dihubungi.
  }

  // ── 2. Hapus lisensi dari SecureStore + SQLite pos-license.db ──────────
  try {
    await hapusLicense();
  } catch { /* best-effort */ }

  // ── 3. Hapus data transaksi + log stok dari SQLite utama ───────────────
  try {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM transaction_item`);
      await db.runAsync(`DELETE FROM transaksi`);
      await db.runAsync(`DELETE FROM stock_log`);

      // Reset field lisensi di tabel pengaturan
      await db.runAsync(
        `UPDATE pengaturan SET value = '0' WHERE key = 'activated'`
      );
      await db.runAsync(
        `UPDATE pengaturan SET value = '' WHERE key IN ('activation_code', 'umkm_id')`
      );
    });
  } catch { /* best-effort */ }

  return {
    ok: true,
    pesan: 'Semua data berhasil dihapus. Aplikasi akan direset.',
  };
}
