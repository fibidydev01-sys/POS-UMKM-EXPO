/**
 * index.ts — SATU PINTU modul lisensi. Tidak ada Tier/tier exports.
 */
export type {
  EntitlementKind, LicenseSource, LicenseState, LicenseSnapshot,
} from './types';
export { licenseKosong } from './types';

export {
  muatLicense, licenseSaatIni, simpanLicense, hapusLicense,
  effectiveNow, sentuhJam, hitungSnapshot,
} from './license-store';

export { mulaiTrial, aktivasiKode } from './activation';
export type { HasilAktivasi } from './activation';

export { verifikasiPembelian } from './billing-verify';
export type { VerifInput, VerifHasil } from './billing-verify';

export { useBilling, PRODUCT_IDS } from './use-billing';
export type { BillingState, ProdukBilling, ProductId, UseBillingOpts } from './use-billing';

export { billingTersedia, isExpoGo } from './iap-module';
