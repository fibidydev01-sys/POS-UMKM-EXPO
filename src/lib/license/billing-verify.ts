/**
 * billing-verify.ts — verifikasi pembelian Google Play di server (Edge Function).
 *
 * Beli Google Play → kind='paid' → semua fitur aktif.
 */
import * as Application from 'expo-application';
import { getDeviceId } from '../utils/device';
import { simpanLicense, licenseSaatIni } from './license-store';
import { functionsBase, anonHeaders, postJson } from './net';
import type { LicenseState } from './types';

export interface VerifInput {
  productId: string;
  purchaseToken: string;
  packageName?: string;
}

export interface VerifHasil {
  ok: boolean;
  pesan: string;
}

interface VerifResp {
  ok?: boolean;
  umkm_id?: string;
  message?: string;
}

export async function verifikasiPembelian(input: VerifInput): Promise<VerifHasil> {
  const base = functionsBase();
  if (!base) return { ok: false, pesan: 'Server verifikasi belum dikonfigurasi.' };
  if (!input.purchaseToken || !input.productId) {
    return { ok: false, pesan: 'Data pembelian tidak lengkap.' };
  }

  const deviceId = await getDeviceId();
  const pkg = input.packageName || Application.applicationId || '';
  const prev = licenseSaatIni();

  let res;
  try {
    res = await postJson<VerifResp>(
      `${base}/verifikasi-iap`,
      {
        product_id:     input.productId,
        purchase_token: input.purchaseToken,
        package_name:   pkg,
        device_id:      deviceId,
        umkm_id:        prev.umkmId ?? undefined,
      },
      anonHeaders(),
      25000
    );
  } catch {
    return { ok: false, pesan: 'Tidak bisa menghubungi server verifikasi. Coba lagi.' };
  }

  const data = res.data;
  if (!res.ok || !data?.ok) {
    return { ok: false, pesan: data?.message ?? `Verifikasi gagal (HTTP ${res.status}).` };
  }

  // beli = paid = semua fitur aktif
  const next: LicenseState = {
    ...prev,
    kind:       'paid',
    umkmId:     data.umkm_id ?? prev.umkmId,
    trialStart: null,
    trialEnd:   null,
    source:     'play',
    v: 1,
  };

  await simpanLicense(next);
  return { ok: true, pesan: 'Pembelian terverifikasi. Semua fitur aktif permanen.' };
}
