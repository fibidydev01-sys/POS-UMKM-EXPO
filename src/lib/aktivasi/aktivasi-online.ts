/**
 * aktivasi-online.ts — activation client (doc 02 Phase 0).
 *
 * SATU-SATUNYA panggilan ke server developer:
 *   POST {DEV_SERVER}/api/aktivasi  { kode, device_id }
 *   → { umkm_id, tier }   (tier: v1 | v2 | v3)
 *
 * Setelah sukses, app autonomous (offline). Server tidak pernah ikut alur bayar.
 *
 * DEV_SERVER dari env publik EXPO_PUBLIC_DEV_SERVER. Jika kosong, fungsi ini
 * mengembalikan error ramah (gunakan aktivasi offline / set env).
 */
import { setKonfigBanyak } from '../db/pengaturan';
import { getDeviceId } from '../utils/device';
import { httpJson } from '../pg/http';
import type { Tier } from '../db/database';

const DEV_SERVER = (process.env.EXPO_PUBLIC_DEV_SERVER ?? '').replace(/\/+$/, '');

export interface HasilAktivasi {
  ok: boolean;
  pesan: string;
  tier?: Tier;
  umkmId?: string;
}

interface AktivasiResp {
  umkm_id?: string;
  tier?: string;
  message?: string;
}

function normalTier(t?: string): Tier {
  return t === 'v3' ? 'v3' : t === 'v2' ? 'v2' : 'v1';
}

/**
 * Aktivasi via server developer. Menyimpan umkm_id + tier + kode + flag activated.
 */
export async function aktivasiOnline(kode: string): Promise<HasilAktivasi> {
  const k = kode.trim().toUpperCase();
  if (!k) return { ok: false, pesan: 'Kode aktivasi kosong.' };
  if (!DEV_SERVER) {
    return {
      ok: false,
      pesan: 'Server aktivasi belum dikonfigurasi (EXPO_PUBLIC_DEV_SERVER). Hubungi penyedia aplikasi.',
    };
  }

  const deviceId = await getDeviceId();

  try {
    const res = await httpJson<AktivasiResp>(`${DEV_SERVER}/api/aktivasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kode: k, device_id: deviceId }),
    }, 20000);

    if (!res.ok || !res.data?.umkm_id) {
      const msg = res.data?.message ?? (res.status === 404 ? 'Kode tidak ditemukan.' : `HTTP ${res.status}`);
      return { ok: false, pesan: `Aktivasi gagal: ${msg}` };
    }

    const tier = normalTier(res.data.tier);
    await setKonfigBanyak({
      activated: '1',
      activation_code: k,
      umkm_id: res.data.umkm_id,
      tier,
    });

    return { ok: true, pesan: 'Aktivasi berhasil.', tier, umkmId: res.data.umkm_id };
  } catch {
    return { ok: false, pesan: 'Tidak bisa menghubungi server aktivasi. Periksa koneksi internet.' };
  }
}
