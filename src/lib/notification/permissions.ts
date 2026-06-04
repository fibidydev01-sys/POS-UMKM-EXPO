/**
 * permissions.ts — izin notifikasi (SDK 56).
 *
 * Urutan KRUSIAL (Android 13+): channel dibuat dulu (channels.ts), baru minta
 * izin di sini.
 *
 * EXPO GO SAFE: lewat loadNotifications() (lazy). Di Expo Go modul null →
 * dianggap "belum diizinkan" (granted:false) tanpa melempar; app tetap boot.
 *
 * cekIzinNotifikasi()  : baca status TANPA prompt.
 * mintaIzinNotifikasi(): minta izin; bila sudah granted, tidak prompt ulang.
 */
import type * as Notifications from 'expo-notifications';
import { loadNotifications } from './notif-module';

export interface HasilIzin {
  granted: boolean;
  status: Notifications.PermissionStatus;
  /** true bila pengguna sudah menolak & tidak bisa diminta ulang (harus ke Setelan). */
  ditolakPermanen: boolean;
}

/** Hasil default saat modul notifikasi tidak tersedia (mis. Expo Go). */
const IZIN_TIDAK_TERSEDIA: HasilIzin = {
  granted: false,
  status: 'undetermined' as unknown as Notifications.PermissionStatus,
  ditolakPermanen: false,
};

function petakan(
  N: typeof Notifications,
  perm: Notifications.NotificationPermissionsStatus
): HasilIzin {
  const granted =
    perm.granted ||
    perm.status === 'granted' ||
    // iOS provisional dianggap boleh menampilkan (silent).
    perm.ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
  return {
    granted,
    status: perm.status,
    ditolakPermanen: !granted && perm.canAskAgain === false,
  };
}

/** Status izin saat ini tanpa memunculkan dialog. */
export async function cekIzinNotifikasi(): Promise<HasilIzin> {
  const N = loadNotifications();
  if (!N) return IZIN_TIDAK_TERSEDIA;
  const perm = await N.getPermissionsAsync();
  return petakan(N, perm);
}

/**
 * Minta izin. Bila sudah granted → kembalikan tanpa prompt. Bila masih bisa
 * diminta → tampilkan dialog OS. Tidak melempar.
 */
export async function mintaIzinNotifikasi(): Promise<HasilIzin> {
  const N = loadNotifications();
  if (!N) return IZIN_TIDAK_TERSEDIA;
  const current = await N.getPermissionsAsync();
  if (current.granted || current.status === 'granted') return petakan(N, current);
  if (current.canAskAgain === false) return petakan(N, current);

  const req = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return petakan(N, req);
}
