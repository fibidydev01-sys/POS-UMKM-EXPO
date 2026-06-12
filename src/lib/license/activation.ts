/**
 * activation.ts — klien aktivasi via Supabase Edge Function.
 *
 * Setelah drop V2: tidak ada tier. Response server masih bisa kirim tier
 * (kolom lama di DB Supabase) tapi kita abaikan — hanya peduli kind dan umkm_id.
 *
 * 3 metode aktivasi:
 *   1. Trial gratis (tombol) → kind='trial', trialEnd dari server
 *   2. Kode is_trial=true   → kind='trial', trialEnd dari server
 *   3. Kode is_trial=false  → kind='paid', langsung unlocked (early access)
 */
import { getDeviceId } from '../utils/device';
import { simpanLicense, licenseSaatIni } from './license-store';
import { functionsBase, anonHeaders, postJson } from './net';
import type { LicenseState } from './types';

function toEpoch(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
  }
  if (typeof v === 'string') {
    const t = new Date(v.replace(' ', 'T')).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export interface HasilAktivasi {
  ok: boolean;
  pesan: string;
  kind?: 'trial' | 'paid';
  trialEnd?: number | null;
}

interface AktivasiResp {
  ok?: boolean;
  umkm_id?: string;
  kind?: 'trial' | 'paid';
  trial_start?: number | string;
  trial_end?: number | string;
  server_time?: number | string;
  message?: string;
  // tier diabaikan (field lama di server, tidak dipakai lagi di client)
}

interface PostBody {
  action: 'trial' | 'code';
  device_id: string;
  kode?: string;
}

async function panggil(body: PostBody): Promise<HasilAktivasi> {
  const base = functionsBase();
  if (!base) {
    return {
      ok: false,
      pesan: 'Server lisensi belum dikonfigurasi (EXPO_PUBLIC_SUPABASE_URL). Hubungi penyedia aplikasi.',
    };
  }

  let res;
  try {
    res = await postJson<AktivasiResp>(`${base}/aktivasi`, body, anonHeaders(), 20000);
  } catch {
    return { ok: false, pesan: 'Tidak bisa menghubungi server. Periksa koneksi internet Anda.' };
  }

  const data = res.data;
  if (!res.ok || !data?.ok || !data.umkm_id) {
    const msg =
      data?.message ??
      (res.status === 404 ? 'Kode tidak ditemukan.' :
       res.status === 409 ? 'Kode sudah dipakai perangkat lain.' :
       `Gagal (HTTP ${res.status}).`);
    return { ok: false, pesan: msg };
  }

  const kind     = data.kind === 'paid' ? 'paid' : 'trial';
  const trialEnd = toEpoch(data.trial_end);

  const prev = licenseSaatIni();
  const next: LicenseState = {
    ...prev,
    kind,
    umkmId:         data.umkm_id,
    activationCode: body.kode ?? prev.activationCode,
    trialStart:     kind === 'trial' ? toEpoch(data.trial_start) : null,
    trialEnd:       kind === 'trial' ? trialEnd : null,
    source:         'code',
    v: 1,
  };

  await simpanLicense(next);

  return {
    ok: true,
    pesan: kind === 'trial'
      ? 'Trial 30 hari aktif. Selamat mencoba!'
      : 'Aktivasi berhasil. Semua fitur aktif.',
    kind,
    trialEnd,
  };
}

export async function mulaiTrial(): Promise<HasilAktivasi> {
  const deviceId = await getDeviceId();
  return panggil({ action: 'trial', device_id: deviceId });
}

export async function aktivasiKode(kode: string): Promise<HasilAktivasi> {
  const k = kode.trim().toUpperCase();
  if (!k) return { ok: false, pesan: 'Kode aktivasi kosong.' };
  const deviceId = await getDeviceId();
  return panggil({ action: 'code', kode: k, device_id: deviceId });
}
