/**
 * license-store.ts — penyimpanan lisensi: SecureStore (MASTER) + SQLite (MIRROR).
 *
 * Tidak ada tier. State hanya: kind (none/trial/paid) + timestamps.
 * SecureStore = sumber kebenaran.
 * SQLite pos-license.db = mirror untuk self-heal bila SecureStore sesaat gagal.
 * Anti-rollback jam: lastSeen hanya naik.
 */
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import type { LicenseSnapshot, LicenseState } from './types';
import { licenseKosong } from './types';

const SECURE_KEY = 'pos_license_v1';
const MIRROR_DB  = 'pos-license.db';
const MIRROR_KEY = 'license_state';

const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const HARI_MS = 24 * 60 * 60 * 1000;

let _cache: LicenseState | null = null;

let _db: SQLite.SQLiteDatabase | null = null;
function db(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(MIRROR_DB);
    _db.execSync(
      `CREATE TABLE IF NOT EXISTS license_kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);`
    );
  }
  return _db;
}

function parse(json: string | null): LicenseState | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Partial<LicenseState & { tier?: unknown }>;
    if (!o || typeof o !== 'object') return null;
    const base = licenseKosong();
    return {
      ...base,
      ...o,
      // Hapus field tier lama jika masih ada di data tersimpan (migrasi)
      trialStart: typeof o.trialStart === 'number' ? o.trialStart : null,
      trialEnd:   typeof o.trialEnd   === 'number' ? o.trialEnd   : null,
      lastSeen:   typeof o.lastSeen   === 'number' ? o.lastSeen   : base.lastSeen,
      updatedAt:  typeof o.updatedAt  === 'number' ? o.updatedAt  : base.updatedAt,
      v: 1,
    };
  } catch {
    return null;
  }
}

async function bacaSecure(): Promise<LicenseState | null> {
  try {
    return parse(await SecureStore.getItemAsync(SECURE_KEY, OPTS));
  } catch {
    return null;
  }
}

async function bacaMirror(): Promise<LicenseState | null> {
  try {
    const row = await db().getFirstAsync<{ value: string | null }>(
      `SELECT value FROM license_kv WHERE key = ?`,
      [MIRROR_KEY]
    );
    return parse(row?.value ?? null);
  } catch {
    return null;
  }
}

async function tulisKeduanya(state: LicenseState): Promise<void> {
  const json = JSON.stringify(state);
  await SecureStore.setItemAsync(SECURE_KEY, json, OPTS);
  try {
    await db().runAsync(
      `INSERT INTO license_kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [MIRROR_KEY, json]
    );
  } catch {
    /* mirror gagal tidak fatal, master sudah tertulis */
  }
}

export async function muatLicense(): Promise<LicenseState> {
  let s = await bacaSecure();
  let perluTulis = false;

  if (!s) {
    const m = await bacaMirror();
    if (m) {
      s = m;
      perluTulis = true;
    }
  }
  if (!s) s = licenseKosong();

  const now = Date.now();
  if (now > s.lastSeen) {
    s.lastSeen = now;
    perluTulis = true;
  }

  _cache = s;
  if (perluTulis) {
    try { await tulisKeduanya(s); } catch { /* best-effort */ }
  }
  return s;
}

export function licenseSaatIni(): LicenseState {
  return _cache ?? licenseKosong();
}

export async function simpanLicense(next: LicenseState): Promise<void> {
  const now = Date.now();
  const merged: LicenseState = {
    ...next,
    lastSeen:  Math.max(next.lastSeen ?? 0, _cache?.lastSeen ?? 0, now),
    updatedAt: now,
    v: 1,
  };
  await tulisKeduanya(merged);
  _cache = merged;
}

export async function hapusLicense(): Promise<void> {
  try { await SecureStore.deleteItemAsync(SECURE_KEY, OPTS); } catch { /* */ }
  try {
    await db().runAsync(`DELETE FROM license_kv WHERE key = ?`, [MIRROR_KEY]);
  } catch { /* */ }
  _cache = licenseKosong();
}

export function effectiveNow(): number {
  const s = licenseSaatIni();
  const now = Date.now();
  const eff = Math.max(now, s.lastSeen);
  if (now > s.lastSeen) {
    s.lastSeen = now;
    _cache = s;
    void tulisKeduanya(s).catch(() => {});
  }
  return eff;
}

export async function sentuhJam(): Promise<void> {
  const s = licenseSaatIni();
  const now = Date.now();
  if (now > s.lastSeen) {
    s.lastSeen = now;
    _cache = s;
    try { await tulisKeduanya(s); } catch { /* */ }
  }
}

export function hitungSnapshot(s: LicenseState = licenseSaatIni()): LicenseSnapshot {
  const eff = effectiveNow();

  if (s.kind === 'paid') {
    return {
      kind: 'paid',
      umkmId: s.umkmId,
      locked: false,
      trialActive: false,
      trialSisaHari: 0,
      trialEnd: null,
    };
  }

  if (s.kind === 'trial' && s.trialEnd != null) {
    const aktif  = eff < s.trialEnd;
    const sisaMs = Math.max(0, s.trialEnd - eff);
    return {
      kind: 'trial',
      umkmId: s.umkmId,
      locked:        !aktif,
      trialActive:   aktif,
      trialSisaHari: aktif ? Math.ceil(sisaMs / HARI_MS) : 0,
      trialEnd:      s.trialEnd,
    };
  }

  return {
    kind: 'none',
    umkmId: s.umkmId,
    locked:        true,
    trialActive:   false,
    trialSisaHari: 0,
    trialEnd:      null,
  };
}
