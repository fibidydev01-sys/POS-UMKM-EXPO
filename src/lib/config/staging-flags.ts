/**
 * staging-flags.ts — FLAG KHUSUS DEV/STAGING (fail-safe, self-removing).
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ PRINSIP: ubah ENV, bukan ubah kode (12-factor). Semua flag DEFAULT MATI.    │
 * │ Bila env tidak dipasang / di-comment → otomatis false → perilaku PRODUCTION.│
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * DUA ENV (setelah drop V2 — EXPO_PUBLIC_POS_VERSION tidak ada lagi):
 *
 *   EXPO_PUBLIC_APP_ENV=staging
 *     → MENGAKTIFKAN UI dev-only (panel dev switcher di Pengaturan).
 *     → Bila kosong / bukan 'staging' → dianggap PRODUCTION → panel hilang.
 *
 *   EXPO_PUBLIC_PAYMENT_ENABLED=true|false
 *     → true  = Google Play Billing (IAP) AKTIF / wajib bayar.
 *     → false = billing dilewati (untuk ngetes tanpa beli). HANYA berpengaruh
 *               saat staging; di production flag ini DIABAIKAN (selalu aktif).
 *
 *   EXPO_PUBLIC_AKTIVASI_ENABLED=true|false
 *     → true  = license check (aktivasi kode/server) AKTIF / wajib aktivasi.
 *     → false = aktivasi dilewati (app jalan tanpa lisensi). HANYA berpengaruh
 *               saat staging; di production flag ini DIABAIKAN (selalu aktif).
 */

function envBool(v: string | undefined): boolean {
  return v === 'true';
}

const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? '').toLowerCase();

export const isStaging: boolean =
  APP_ENV === 'staging' || APP_ENV === 'dev' || APP_ENV === 'development';

const RAW_PAYMENT = envBool(process.env.EXPO_PUBLIC_PAYMENT_ENABLED);
const RAW_AKTIVASI = envBool(process.env.EXPO_PUBLIC_AKTIVASI_ENABLED);

export function paymentEnabled(): boolean {
  if (!isStaging) return true;
  return RAW_PAYMENT;
}

export function aktivasiEnabled(): boolean {
  if (!isStaging) return true;
  return RAW_AKTIVASI;
}

export function showVersionSwitcher(): boolean {
  return isStaging;
}

export interface StagingInfo {
  isStaging: boolean;
  appEnv: string;
  paymentEnabled: boolean;
  aktivasiEnabled: boolean;
  showVersionSwitcher: boolean;
}

export function stagingInfo(): StagingInfo {
  return {
    isStaging,
    appEnv: APP_ENV || '(production)',
    paymentEnabled: paymentEnabled(),
    aktivasiEnabled: aktivasiEnabled(),
    showVersionSwitcher: showVersionSwitcher(),
  };
}
