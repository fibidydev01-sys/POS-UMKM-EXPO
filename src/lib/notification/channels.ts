/**
 * channels.ts — channel notifikasi Android (SDK 56).
 *
 * Android 8+ MEWAJIBKAN channel; importance (suara/getar/heads-up) diatur per-
 * channel oleh OS. Channel juga prasyarat izin di Android 13+, karena itu
 * setupChannels() dipanggil SEBELUM minta izin. Di iOS no-op.
 *
 * EXPO GO SAFE: expo-notifications dimuat lewat loadNotifications() (lazy). Di
 * Expo Go modul null → fungsi ini no-op (app tetap boot). Lihat notif-module.ts.
 *
 * Dua channel:
 *   stock-alert → HIGH   : stok/bahan habis/menipis (perlu perhatian segera).
 *   stock-info  → DEFAULT: reminder pagi/sore/mingguan (informasional).
 */
import { Platform } from 'react-native';
import { loadNotifications } from './notif-module';

export const CHANNEL_ALERT = 'stock-alert';
export const CHANNEL_INFO = 'stock-info';

const BRAND_COLOR = '#C75B39';

/** Buat / perbarui channel Android. Idempoten, aman di iOS & Expo Go. Tidak melempar. */
export async function setupChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = loadNotifications();
  if (!N) return; // Expo Go: lewati
  try {
    await N.setNotificationChannelAsync(CHANNEL_ALERT, {
      name: 'Peringatan Stok',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: BRAND_COLOR,
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      sound: 'custom_sound.wav',  // ← custom sound
    });

    await N.setNotificationChannelAsync(CHANNEL_INFO, {
      name: 'Info & Pengingat Stok',
      importance: N.AndroidImportance.DEFAULT,
      lightColor: BRAND_COLOR,
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
      // sound: tidak diset → default
    });
  } catch {
    // Abaikan: channel gagal dibuat tidak boleh mengganggu inisialisasi app.
  }
}
