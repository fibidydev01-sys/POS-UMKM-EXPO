/**
 * types.ts — tipe domain lisensi (trial + paid). Tidak ada tier V1/V2.
 *
 * Model entitlement setelah drop V2:
 *   - kind 'none'  → belum aktivasi → app terkunci.
 *   - kind 'trial' → trial server-anchored; penuh selama < trial_end, lalu terkunci.
 *   - kind 'paid'  → lisensi permanen (kode paid / Google Play Billing).
 *
 * Tidak ada field tier. Gate fitur hanya: locked vs unlocked.
 */

export type EntitlementKind = 'none' | 'trial' | 'paid';

export type LicenseSource = 'code' | 'play' | 'offline' | null;

/**
 * State lisensi — disimpan di SecureStore (MASTER) dan dicermin ke
 * SQLite pos-license.db (tabel license_kv).
 *
 * Semua timestamp epoch milidetik. trial_start & trial_end dari server.
 * lastSeen adalah high-water mark untuk anti-rollback jam perangkat.
 */
export interface LicenseState {
  kind: EntitlementKind;
  umkmId: string | null;
  activationCode: string | null;

  trialStart: number | null;
  trialEnd: number | null;

  lastSeen: number;
  updatedAt: number;

  source: LicenseSource;
  v: number;
}

export function licenseKosong(now: number = Date.now()): LicenseState {
  return {
    kind: 'none',
    umkmId: null,
    activationCode: null,
    trialStart: null,
    trialEnd: null,
    lastSeen: now,
    updatedAt: now,
    source: null,
    v: 1,
  };
}

export interface LicenseSnapshot {
  kind: EntitlementKind;
  umkmId: string | null;
  locked: boolean;
  trialActive: boolean;
  trialSisaHari: number;
  trialEnd: number | null;
}
