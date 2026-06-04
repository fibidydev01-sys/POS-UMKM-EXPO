/**
 * scheduler.ts — penjadwalan reminder stok berulang (SDK 56).
 *
 * Reminder: pagi (DAILY), sore (DAILY), mingguan (WEEKLY). Identifier TETAP →
 * reschedule cukup batalkan ID lalu jadwalkan lagi (tidak dobel).
 *
 * FORMAT TRIGGER SDK 56: WAJIB pakai field `type`
 * (SchedulableTriggerInputTypes.DAILY / .WEEKLY). weekday 1-7, 1 = Minggu.
 *
 * EXPO GO SAFE: expo-notifications lewat loadNotifications() (lazy). Di Expo Go
 * modul null → semua fungsi no-op; app tetap boot. Lihat notif-module.ts.
 *
 * Semua fungsi menelan error (best-effort) agar tidak mengganggu UI/boot.
 */
import { loadNotifications } from './notif-module';
import { CHANNEL_INFO } from './channels';
import { getNotifSettings } from './settings';
import type { JamMenit } from './settings';

const ID_PAGI = 'stock-reminder-pagi';
const ID_SORE = 'stock-reminder-sore';
const ID_WEEKLY = 'stock-reminder-weekly';

const SEMUA_ID = [ID_PAGI, ID_SORE, ID_WEEKLY];

async function batalkan(id: string): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // ID mungkin belum terdaftar — aman diabaikan.
  }
}

/** Batalkan semua reminder stok terjadwal. */
export async function cancelStockReminders(): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  await Promise.all(SEMUA_ID.map(batalkan));
}

async function jadwalkanHarian(
  id: string,
  jam: JamMenit,
  title: string,
  body: string
): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  await N.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data: { target: 'stok' } },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: jam.hour,
      minute: jam.minute,
      channelId: CHANNEL_INFO,
    },
  });
}

async function jadwalkanMingguan(
  id: string,
  weekday: number,
  jam: JamMenit,
  title: string,
  body: string
): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  await N.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data: { target: 'stok' } },
    trigger: {
      type: N.SchedulableTriggerInputTypes.WEEKLY,
      weekday, // 1-7, 1 = Minggu
      hour: jam.hour,
      minute: jam.minute,
      channelId: CHANNEL_INFO,
    },
  });
}

/**
 * Tata ulang seluruh reminder sesuai NotifSettings terbaru.
 * Pola: batalkan dulu semua → jadwalkan yang aktif. Idempoten.
 */
export async function rescheduleStockReminders(): Promise<void> {
  const N = loadNotifications();
  if (!N) return; // Expo Go: tidak ada penjadwalan
  try {
    const s = await getNotifSettings();

    await cancelStockReminders();
    if (!s.enabled) return;

    const tugas: Promise<void>[] = [];

    if (s.pagiEnabled) {
      tugas.push(
        jadwalkanHarian(
          ID_PAGI,
          s.pagi,
          'Cek stok pagi ini',
          'Pastikan stok cukup sebelum mulai jualan hari ini.'
        )
      );
    }
    if (s.soreEnabled) {
      tugas.push(
        jadwalkanHarian(
          ID_SORE,
          s.sore,
          'Cek sisa stok',
          'Lihat sisa stok sebelum tutup — catat yang perlu dibeli.'
        )
      );
    }
    if (s.weeklyEnabled) {
      tugas.push(
        jadwalkanMingguan(
          ID_WEEKLY,
          s.weeklyWeekday,
          s.weekly,
          'Waktunya belanja stok',
          'Pengingat rutin: restock barang untuk minggu ini.'
        )
      );
    }

    await Promise.all(tugas);
  } catch {
    // best-effort
  }
}
