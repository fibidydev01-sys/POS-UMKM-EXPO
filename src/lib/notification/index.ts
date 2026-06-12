/**
 * index.ts — SATU PINTU modul notifikasi.
 *
 * initNotifications() dipanggil sekali di _layout setelah DB siap:
 *   1. pasang notification handler (foreground) — SDK 56: shouldShowBanner +
 *      shouldShowList (menggantikan shouldShowAlert yang deprecated).
 *   2. buat channel Android (prasyarat izin Android 13+).
 *   3. minta izin notifikasi.
 *   4. jadwalkan reminder pagi/sore/mingguan sesuai NotifSettings.
 *
 * EXPO GO SAFE: expo-notifications dimuat lewat loadNotifications() (lazy). Di
 * Expo Go modul null → initNotifications() jadi no-op; app tetap boot normal.
 * Notifikasi sungguhan berjalan di development build / standalone. Lihat
 * notif-module.ts.
 *
 * Semua langkah best-effort: kegagalan tidak boleh menggagalkan boot app.
 *
 * Lapis 3 DIHAPUS:
 *   - checkAndNotifyLowStockBahan dihapus dari re-export
 *   - notifyOpnameSelisihBahan dihapus dari re-export
 *   - bahan-notif.ts tidak lagi di-import
 */
import { loadNotifications, isExpoGo } from './notif-module';
import { setupChannels } from './channels';
import { mintaIzinNotifikasi } from './permissions';
import { rescheduleStockReminders } from './scheduler';

let _handlerSet = false;

/** Pasang handler foreground sekali (idempoten). No-op di Expo Go. */
function pasangHandler(): void {
  if (_handlerSet) return;
  const N = loadNotifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, // banner OS saat app foreground (SDK 56)
      shouldShowList: true,   // tercatat di notification tray (SDK 56)
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  _handlerSet = true;
}

/**
 * Inisialisasi penuh notifikasi. Urutan penting: handler → channel → izin →
 * jadwal. Aman dipanggil berkali-kali. Tidak melempar. No-op di Expo Go.
 */
export async function initNotifications(): Promise<void> {
  if (isExpoGo) return; // Expo Go: notifikasi tidak didukung — lewati diam-diam.
  try {
    pasangHandler();
    await setupChannels();      // channel dulu (prasyarat izin Android 13+)
    await mintaIzinNotifikasi();
    await rescheduleStockReminders();
  } catch {
    // best-effort — jangan ganggu boot
  }
}

// ── Re-export satu pintu ──
export {
  getNotifSettings,
  updateNotifSettings,
  resetNotifSettings,
  formatJam,
  DEFAULT_NOTIF_SETTINGS,
} from './settings';
export type { NotifSettings, JamMenit } from './settings';

export { cekIzinNotifikasi, mintaIzinNotifikasi } from './permissions';
export type { HasilIzin } from './permissions';

export { rescheduleStockReminders, cancelStockReminders } from './scheduler';

// Notifikasi PRODUK (level menu, mode 'product').
export { checkAndNotifyLowStock, notifyOpnameSelisih } from './stock-notif';
// checkAndNotifyLowStockBahan & notifyOpnameSelisihBahan DIHAPUS (lapis 3)

export { setupChannels, CHANNEL_ALERT, CHANNEL_INFO } from './channels';
export { isExpoGo } from './notif-module';
