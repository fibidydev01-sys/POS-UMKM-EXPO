/**
 * pg-ready.ts — apakah QRIS siap dipakai? (degradasi anggun, Phase 1)
 *
 * QRIS ditampilkan HANYA bila:
 *   - tier mengizinkan (features.qris), DAN
 *   - ada provider aktif di pg_credentials, DAN
 *   - secret-nya benar-benar ada di SecureStore (has_secret bisa basi).
 */
import { features } from '../config/features';
import { getPgAktif } from '../db/pg-credentials';
import { adaSecret } from '../secure/secure-store';

export interface PgReady {
  ready: boolean;
  alasan: string;
}

export async function cekPgReady(): Promise<PgReady> {
  if (!features.qris) return { ready: false, alasan: 'Tier ini tidak termasuk QRIS.' };
  const meta = await getPgAktif();
  if (!meta) return { ready: false, alasan: 'Belum ada penyedia QRIS aktif.' };
  const ok = await adaSecret(meta.provider);
  if (!ok) return { ready: false, alasan: 'Kredensial QRIS belum lengkap di perangkat.' };
  return { ready: true, alasan: 'Siap.' };
}
