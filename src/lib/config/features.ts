/**
 * features.ts — feature flags berbasis TIER (v1/v2/v3).
 *
 * Tier datang dari hasil aktivasi (disimpan lokal), bukan lagi hanya env.
 * Karena banyak komponen membaca `features` secara sinkron, kita simpan tier
 * aktif di modul ini dan sediakan:
 *   - muatTierDariDb()  → panggil sekali saat start (root layout).
 *   - setTier(tier)     → set manual (mis. setelah aktivasi).
 *   - features          → objek sinkron yang dipakai komponen (snapshot tier aktif).
 *
 * Fallback awal dari env EXPO_PUBLIC_POS_VERSION agar dev tetap mudah.
 */
import type { Tier } from '../db/database';

const ENV_RAW = (process.env.EXPO_PUBLIC_POS_VERSION ?? 'v1').toLowerCase();
const ENV_TIER: Tier = ENV_RAW === 'v3' ? 'v3' : ENV_RAW === 'v2' ? 'v2' : 'v1';

let _tier: Tier = ENV_TIER;

/** Hitung objek flags dari sebuah tier. */
function computeFlags(tier: Tier) {
  const v2 = tier === 'v2' || tier === 'v3';
  const v3 = tier === 'v3';
  return {
    tier,
    /** Pilihan metode bayar non-tunai (QRIS/transfer/debit) + uang & kembalian. */
    payment: v2,
    /** Pembayaran QRIS digital (adapter PG + polling). */
    qris: v2,
    /** Mesin promo otomatis (BOGO / Buy2Get1). */
    promoEngine: v2,
    /** Menu pengelolaan promo di Pengaturan + halaman /promo. */
    promoManagement: v2,
    /** Aksi refund pada riwayat. */
    refund: v2,
    /** Fitur lanjutan tier 3 (placeholder: multi-kasir dll). */
    advanced: v3,
  } as const;
}

/** Objek flags AKTIF (mutable container agar import tetap dapat snapshot terbaru). */
export const features = { ...computeFlags(_tier) } as ReturnType<typeof computeFlags> & {
  tier: Tier;
};

function refreshExport(): void {
  Object.assign(features, computeFlags(_tier));
}

export function getTierAktif(): Tier {
  return _tier;
}

export function setTier(tier: Tier): void {
  _tier = tier;
  refreshExport();
}

/** Urutan tier untuk perbandingan (v1 < v2 < v3). */
const TIER_ORDER: Record<Tier, number> = { v1: 1, v2: 2, v3: 3 };
function maxTier(a: Tier, b: Tier): Tier {
  return TIER_ORDER[a] >= TIER_ORDER[b] ? a : b;
}

/**
 * Muat tier dari DB (dipanggil di root layout sebelum render konten).
 *
 * PENTING: DB tidak boleh MENURUNKAN tier dari env. EXPO_PUBLIC_POS_VERSION
 * berfungsi sebagai "lantai" untuk pengembangan; aktivasi (yang menulis tier ke
 * DB) hanya bisa MENAIKKAN. Jadi tier efektif = max(env, db). Tanpa ini, tier DB
 * default 'v1' akan menimpa env 'v2' dan mematikan QRIS secara tak terduga.
 */
export async function muatTierDariDb(): Promise<void> {
  // Import dinamis untuk hindari siklus (pengaturan → database → ...).
  const { getTier } = await import('../db/pengaturan');
  try {
    const dbTier = await getTier();
    setTier(maxTier(ENV_TIER, dbTier));
  } catch {
    // biarkan fallback env
  }
}

export type FeatureKey = keyof ReturnType<typeof computeFlags>;
export const POS_VERSION: Tier = ENV_TIER;
