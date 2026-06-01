/**
 * app-lock.ts — kunci aplikasi dgn biometrik/PIN (Phase 4).
 *
 * Dipakai untuk menjaga akses ke kasir / setup PG saat HP dicuri keadaan unlock
 * (doc 01 §10). Preferensi "kunci aktif" disimpan di pengaturan (bukan secret).
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { getDb } from '../db/database';

const KEY_LOCK = 'app_lock_enabled';

export async function lockAktif(): Promise<boolean> {
  const db = getDb();
  const row = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM pengaturan WHERE key = ?`, [KEY_LOCK]
  );
  return row?.value === '1';
}

export async function setLockAktif(aktif: boolean): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO pengaturan (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [KEY_LOCK, aktif ? '1' : '0']
  );
}

export interface KemampuanBiometrik {
  adaHardware: boolean;
  terdaftar: boolean;
  bisa: boolean;
}

export async function cekBiometrik(): Promise<KemampuanBiometrik> {
  const adaHardware = await LocalAuthentication.hasHardwareAsync();
  const terdaftar = await LocalAuthentication.isEnrolledAsync();
  return { adaHardware, terdaftar, bisa: adaHardware && terdaftar };
}

/**
 * Minta autentikasi. Mengembalikan true bila sukses ATAU bila perangkat tidak
 * mendukung biometrik (agar tidak mengunci pengguna keluar; PIN OS jadi andalan).
 */
export async function mintaAuth(alasan = 'Buka aplikasi kasir'): Promise<boolean> {
  const cap = await cekBiometrik();
  if (!cap.bisa) {
    // Tidak ada biometrik terdaftar → fallback: izinkan (atau arahkan set PIN OS).
    return true;
  }
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: alasan,
    cancelLabel: 'Batal',
    disableDeviceFallback: false,
  });
  return res.success;
}
