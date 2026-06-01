/**
 * secure-store.ts — penyimpanan RAHASIA PG di OS secure storage.
 *
 * ATURAN KERAS (doc 01 §10, Phase S):
 *   - Secret key PG (Xendit Secret, Midtrans Server Key, DOKU ClientSecret + RSA
 *     private key) HANYA boleh ada di sini (Keychain iOS / Keystore Android).
 *   - TIDAK PERNAH masuk SQLite biasa, AsyncStorage, console.log, atau state
 *     yang bisa di-serialize / di-backup.
 *   - Export/backup data TIDAK menyertakan apa pun dari modul ini.
 *
 * Catatan batas Android Keystore (~2KB/nilai): RSA-2048 PEM (~1.7KB) aman.
 * RSA-4096 bisa lewat batas → pakai 2048, atau enkripsi PEM ke file aman.
 * Lihat doc 02 Phase 3.
 */
import * as SecureStore from 'expo-secure-store';
import type { PGProvider } from '../pg/types';

/** Prefix kunci agar tidak bentrok dengan data lain di Keychain/Keystore. */
const PREFIX = 'pos_pg_secret_';
const RSA_SUFFIX = '_rsa_private';

/** Opsi: secret PG butuh device unlock, tidak perlu sinkron iCloud. */
const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function keyFor(provider: PGProvider): string {
  return `${PREFIX}${provider}`;
}

function rsaKeyFor(provider: PGProvider): string {
  return `${PREFIX}${provider}${RSA_SUFFIX}`;
}

/**
 * Simpan secret utama provider.
 *   - Xendit  : Secret Key
 *   - Midtrans: Server Key
 *   - DOKU    : "ClientId:ClientSecret"  (apiKey gabungan)
 */
export async function simpanSecret(provider: PGProvider, secret: string): Promise<void> {
  if (!secret) throw new Error('Secret kosong.');
  await SecureStore.setItemAsync(keyFor(provider), secret, OPTS);
}

export async function ambilSecret(provider: PGProvider): Promise<string | null> {
  return SecureStore.getItemAsync(keyFor(provider), OPTS);
}

export async function hapusSecret(provider: PGProvider): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(provider), OPTS);
  // Sekalian hapus RSA bila ada (khusus DOKU).
  await SecureStore.deleteItemAsync(rsaKeyFor(provider), OPTS);
}

export async function adaSecret(provider: PGProvider): Promise<boolean> {
  const v = await ambilSecret(provider);
  return !!v && v.length > 0;
}

// ── RSA private key (khusus DOKU SNAP, Phase 3) ──────────────────────────────

/** Simpan RSA private key PEM terpisah dari apiKey (lebih aman & rapi). */
export async function simpanRsaPrivateKey(provider: PGProvider, pem: string): Promise<void> {
  if (!pem) throw new Error('RSA private key kosong.');
  // Peringatan ukuran (tidak fatal): Keystore Android bisa menolak >2KB.
  if (pem.length > 2000) {
    // Hanya warning developer; jangan log isi PEM.
    console.warn('[secure-store] RSA PEM > 2KB — perangkat Android tertentu bisa menolak.');
  }
  await SecureStore.setItemAsync(rsaKeyFor(provider), pem, OPTS);
}

export async function ambilRsaPrivateKey(provider: PGProvider): Promise<string | null> {
  return SecureStore.getItemAsync(rsaKeyFor(provider), OPTS);
}

export async function adaRsaPrivateKey(provider: PGProvider): Promise<boolean> {
  const v = await ambilRsaPrivateKey(provider);
  return !!v && v.length > 0;
}
