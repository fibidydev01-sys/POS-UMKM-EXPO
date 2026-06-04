/**
 * settings.ts — pengaturan notifikasi stok, disimpan di SQLite (tabel pengaturan).
 *
 * SUMBER KEBENARAN tipe NotifSettings & JamMenit ada di sini, lalu di-re-export
 * lewat lib/notification/index.ts agar komponen meng-import dari satu pintu.
 *
 * Disimpan sebagai SATU baris JSON di tabel `pengaturan` (key = 'notif_settings'),
 * konsisten dengan pola key-value yang sudah dipakai app (lihat lib/db/pengaturan).
 * Tidak menambah tabel/migration baru — aman & minimal.
 *
 * Default (bisa diubah user): pagi 08:00, sore 16:00, mingguan Senin 09:00.
 * weeklyWeekday memakai konvensi expo-notifications: 1-7 dengan 1 = Minggu,
 * sehingga Senin = 2 (lihat scheduler.ts).
 */
import { getDb } from '../db/database';

/** Jam + menit (24 jam). */
export interface JamMenit {
  hour: number;   // 0-23
  minute: number; // 0-59
}

export interface NotifSettings {
  /** Master switch seluruh notifikasi stok. */
  enabled: boolean;

  /** Reminder harian pagi. */
  pagiEnabled: boolean;
  pagi: JamMenit;

  /** Reminder harian sore. */
  soreEnabled: boolean;
  sore: JamMenit;

  /** Reminder mingguan (belanja stok rutin). */
  weeklyEnabled: boolean;
  weekly: JamMenit;
  /** Hari mingguan: 1-7 (1 = Minggu). Senin = 2. */
  weeklyWeekday: number;
}

const KEY = 'notif_settings';

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  enabled: true,
  pagiEnabled: true,
  pagi: { hour: 8, minute: 0 },
  soreEnabled: true,
  sore: { hour: 16, minute: 0 },
  weeklyEnabled: true,
  weekly: { hour: 9, minute: 0 },
  weeklyWeekday: 2, // Senin
};

/** Format JamMenit → "HH:MM" (dengan nol depan). */
export function formatJam(jm: JamMenit): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(jm.hour)}:${p(jm.minute)}`;
}

function clampJam(jm: Partial<JamMenit> | undefined, fb: JamMenit): JamMenit {
  if (!jm) return { ...fb };
  const hour = Number.isFinite(jm.hour) ? Math.min(23, Math.max(0, Math.trunc(jm.hour as number))) : fb.hour;
  const minute = Number.isFinite(jm.minute) ? Math.min(59, Math.max(0, Math.trunc(jm.minute as number))) : fb.minute;
  return { hour, minute };
}

/** Gabungkan data parsial (mis. dari DB lama) dengan default agar selalu lengkap. */
function normalisasi(raw: Partial<NotifSettings> | null | undefined): NotifSettings {
  const d = DEFAULT_NOTIF_SETTINGS;
  if (!raw) return { ...d, pagi: { ...d.pagi }, sore: { ...d.sore }, weekly: { ...d.weekly } };
  const weekday = Number.isFinite(raw.weeklyWeekday)
    ? Math.min(7, Math.max(1, Math.trunc(raw.weeklyWeekday as number)))
    : d.weeklyWeekday;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    pagiEnabled: typeof raw.pagiEnabled === 'boolean' ? raw.pagiEnabled : d.pagiEnabled,
    pagi: clampJam(raw.pagi, d.pagi),
    soreEnabled: typeof raw.soreEnabled === 'boolean' ? raw.soreEnabled : d.soreEnabled,
    sore: clampJam(raw.sore, d.sore),
    weeklyEnabled: typeof raw.weeklyEnabled === 'boolean' ? raw.weeklyEnabled : d.weeklyEnabled,
    weekly: clampJam(raw.weekly, d.weekly),
    weeklyWeekday: weekday,
  };
}

/** Baca pengaturan (selalu lengkap; default bila belum pernah disimpan). */
export async function getNotifSettings(): Promise<NotifSettings> {
  const db = getDb();
  try {
    const row = await db.getFirstAsync<{ value: string | null }>(
      `SELECT value FROM pengaturan WHERE key = ?`,
      [KEY]
    );
    if (!row?.value) return normalisasi(null);
    const parsed = JSON.parse(row.value) as Partial<NotifSettings>;
    return normalisasi(parsed);
  } catch {
    return normalisasi(null);
  }
}

async function simpan(settings: NotifSettings): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO pengaturan (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [KEY, JSON.stringify(settings)]
  );
}

/** Patch sebagian field lalu simpan; kembalikan hasil tergabung. */
export async function updateNotifSettings(patch: Partial<NotifSettings>): Promise<NotifSettings> {
  const current = await getNotifSettings();
  const next = normalisasi({ ...current, ...patch });
  await simpan(next);
  return next;
}

/** Kembalikan ke default & simpan. */
export async function resetNotifSettings(): Promise<NotifSettings> {
  const next = normalisasi(null);
  await simpan(next);
  return next;
}
