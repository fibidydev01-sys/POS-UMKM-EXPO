/**
 * notif-module.ts — pemuat AMAN untuk expo-notifications.
 *
 * MASALAH (lihat log crash): sejak Expo SDK 53, push/local notifications DIHAPUS
 * dari Expo Go. Pada SDK 56, sekadar MENG-IMPORT 'expo-notifications' memicu file
 * side-effect (DevicePushTokenAutoRegistration.fx.js) yang MELEMPAR error saat
 * dievaluasi di Expo Go. Karena _layout.tsx & modul notifikasi meng-import paket
 * itu secara statis, SELURUH app gagal boot ("missing default export" →
 * "Cannot read property 'ErrorBoundary'").
 *
 * SOLUSI: jangan pernah meng-import 'expo-notifications' secara statis di jalur
 * boot. Semua modul notifikasi memakai:
 *   - `import type * as Notifications from 'expo-notifications'` → HANYA tipe,
 *     dihapus saat kompilasi, TANPA efek runtime.
 *   - `loadNotifications()` di bawah → require DINAMIS yang hanya dievaluasi saat
 *     fungsi dipanggil, DAN di-skip total di Expo Go.
 *
 * Hasilnya:
 *   - Expo Go  : app BOOT normal; semua fungsi notifikasi jadi no-op (notif tidak
 *                muncul — memang tidak didukung Expo Go).
 *   - Dev build / standalone (npx expo run:android / EAS) : notifikasi berjalan
 *     penuh seperti biasa.
 *
 * Untuk mengaktifkan notifikasi sungguhan, jalankan di development build, bukan
 * Expo Go: https://docs.expo.dev/develop/development-builds/introduction/
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';

/**
 * true bila app berjalan di Expo Go (storeClient). Di dev build / standalone
 * nilainya false sehingga modul notifikasi dimuat penuh.
 */
export const isExpoGo: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let _cached: typeof NotificationsType | null | undefined;

/**
 * Muat modul expo-notifications secara lazy. Mengembalikan null bila di Expo Go
 * atau bila modul gagal dimuat. Aman dipanggil sesering apa pun (hasil di-cache).
 */
export function loadNotifications(): typeof NotificationsType | null {
  if (isExpoGo) return null;
  if (_cached !== undefined) return _cached;
  try {
    // require DINAMIS: dievaluasi hanya saat fungsi ini dipanggil (bukan saat
    // file di-import), sehingga side-effect paket tidak pernah jalan di Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    _cached = require('expo-notifications') as typeof NotificationsType;
  } catch {
    _cached = null;
  }
  return _cached;
}
