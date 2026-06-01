/**
 * registry.ts — daftar adapter PG + perakit kredensial runtime.
 *
 * Memisahkan: METADATA (di SQLite, tabel pg_credentials) vs SECRET (di SecureStore).
 * Saat akan transaksi, kita rakit PGRuntimeCreds dari keduanya.
 */
import type { PGAdapter, PGProvider, PGRuntimeCreds } from './types';
import { xenditAdapter } from './xendit';
import { midtransAdapter } from './midtrans';
import { dokuAdapter } from './doku';
import { ambilSecret, ambilRsaPrivateKey } from '../secure/secure-store';
import { getPgAktif } from '../db/pg-credentials';

const REGISTRY: Record<PGProvider, PGAdapter> = {
  xendit: xenditAdapter,
  midtrans: midtransAdapter,
  doku: dokuAdapter,
};

export function getAdapter(provider: PGProvider): PGAdapter {
  const a = REGISTRY[provider];
  if (!a) throw new Error(`Adapter PG tidak dikenal: ${provider}`);
  return a;
}

export const PROVIDER_LABEL: Record<PGProvider, string> = {
  xendit: 'Xendit',
  midtrans: 'Midtrans',
  doku: 'DOKU',
};

/**
 * Rakit kredensial runtime untuk provider tertentu (metadata + secret).
 * Mengembalikan null bila secret tidak ada.
 */
export async function rakitCreds(provider: PGProvider): Promise<PGRuntimeCreds | null> {
  const meta = await getPgAktif();
  if (!meta || meta.provider !== provider) {
    // Coba ambil metadata provider spesifik walau bukan yang aktif (untuk Test).
  }
  const secret = await ambilSecret(provider);
  if (!secret) return null;
  const rsa = provider === 'doku' ? await ambilRsaPrivateKey(provider) : null;
  const mode = meta?.provider === provider ? meta.mode : 'sandbox';
  return { provider, mode, secret, rsaPrivateKey: rsa };
}

/** Kredensial runtime dari PROVIDER AKTIF (untuk jalur bayar). */
export async function rakitCredsAktif(): Promise<PGRuntimeCreds | null> {
  const meta = await getPgAktif();
  if (!meta) return null;
  const secret = await ambilSecret(meta.provider);
  if (!secret) return null;
  const rsa = meta.provider === 'doku' ? await ambilRsaPrivateKey(meta.provider) : null;
  return { provider: meta.provider, mode: meta.mode, secret, rsaPrivateKey: rsa };
}
