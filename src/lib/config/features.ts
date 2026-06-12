/**
 * features.ts — feature flags FLAT. Tidak ada tier V1/V2.
 *
 * Setelah drop V2, app hanya punya 2 state:
 *   locked   = belum bayar / trial habis
 *   unlocked = sudah bayar (Google Play / kode paid) atau trial aktif
 *
 * Semua fitur aktif saat unlocked. Tidak ada computeFlags(tier),
 * tidak ada maxTier, tidak ada DEV_OVERRIDE tier.
 */
import { muatLicense, hitungSnapshot } from '../license/license-store';
import type { LicenseSnapshot } from '../license/types';

type Listener = () => void;
const listeners = new Set<Listener>();

export interface Flags {
  // Status lisensi
  locked: boolean;
  trialActive: boolean;
  trialSisaHari: number;
  trialEnd: number | null;
  // Fitur kasir — semua true saat unlocked
  kasir: boolean;
  riwayat: boolean;
  laporan: boolean;
  menu: boolean;
  backup: boolean;
  printer: boolean;
  promoEngine: boolean;
  promoManagement: boolean;
  refund: boolean;
  inventory: boolean;
}

function snapshotKeFlags(snap: LicenseSnapshot): Flags {
  const unlocked = !snap.locked;
  return {
    locked:        snap.locked,
    trialActive:   snap.trialActive,
    trialSisaHari: snap.trialSisaHari,
    trialEnd:      snap.trialEnd,
    kasir:         unlocked,
    riwayat:       unlocked,
    laporan:       unlocked,
    menu:          unlocked,
    backup:        unlocked,
    printer:       unlocked,
    promoEngine:   unlocked,
    promoManagement: unlocked,
    refund:        unlocked,
    inventory:     unlocked,
  };
}

export const features: Flags = snapshotKeFlags(hitungSnapshot());

function refreshExport(): void {
  Object.assign(features, snapshotKeFlags(hitungSnapshot()));
  listeners.forEach((fn) => { try { fn(); } catch { /* abaikan */ } });
}

export function licenseSnapshot(): LicenseSnapshot {
  return hitungSnapshot();
}

export async function muatLisensi(): Promise<void> {
  try {
    await muatLicense();
  } catch {
    /* hitungSnapshot pakai default 'none' (terkunci) */
  }
  refreshExport();
}

export const muatTierDariDb = muatLisensi;

export function refreshFlags(): void {
  refreshExport();
}

export function subscribeFlags(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Dev-only version switcher (staging) ──────────────────────────────────
// Tidak ada tier override lagi. Hanya bisa toggle locked/unlocked untuk preview UI.

let _devUnlocked: boolean | null = null;

export function setDevUnlocked(val: boolean | null): void {
  _devUnlocked = val;
  refreshExport();
}

export function getDevUnlocked(): boolean | null {
  return _devUnlocked;
}

export type FeatureKey = keyof Flags;
