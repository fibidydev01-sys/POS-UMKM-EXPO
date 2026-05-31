/**
 * Feature flags V1 / V2.
 *
 * Default = V1 (fitur inti UMKM). Set EXPO_PUBLIC_POS_VERSION=v2 untuk
 * mengaktifkan fitur lanjutan (payment method, promo engine, refund).
 *
 * Tidak ada regresi: kasir tetap berfungsi penuh di V1 maupun V2.
 */

const RAW = (process.env.EXPO_PUBLIC_POS_VERSION ?? 'v1').toLowerCase();
export const POS_VERSION: 'v1' | 'v2' = RAW === 'v2' ? 'v2' : 'v1';

const isV2 = POS_VERSION === 'v2';

export const features = {
  /** Pilihan metode bayar (QRIS/transfer/debit) + input uang & kembalian. */
  payment: isV2,
  /** Mesin promo otomatis (BOGO / Buy2Get1) saat hitung keranjang. */
  promoEngine: isV2,
  /** Menu pengelolaan promo di Pengaturan + halaman /promo. */
  promoManagement: isV2,
  /** Aksi refund pada riwayat (void selalu tersedia). */
  refund: isV2,
} as const;

export type FeatureKey = keyof typeof features;
