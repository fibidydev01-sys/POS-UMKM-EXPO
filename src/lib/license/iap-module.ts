/**
 * iap-module.ts — pemuat AMAN untuk `expo-iap` (pola sama dgn notif-module.ts).
 *
 * MASALAH: `expo-iap` butuh modul NATIVE (Google Play Billing / StoreKit). Di
 * Expo Go modul ini TIDAK ADA, dan meng-import-nya bisa melempar saat dievaluasi.
 * Agar app tetap BOOT di Expo Go (untuk uji UI non-billing), kita TIDAK meng-import
 * 'expo-iap' secara statis di jalur boot.
 *
 * SOLUSI:
 *   - `import type` → hanya tipe (dihapus saat kompilasi, tanpa efek runtime).
 *   - `loadIap()` → require DINAMIS, dievaluasi hanya saat dipanggil, dan di-skip
 *     total di Expo Go. Mengembalikan null bila tidak tersedia.
 *
 * Billing SUNGGUHAN hanya berjalan di development build / standalone (EAS), BUKAN
 * Expo Go. Lihat: https://docs.expo.dev/develop/development-builds/introduction/
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** true bila berjalan di Expo Go (storeClient). */
export const isExpoGo: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Bentuk minimal API expo-iap yang kita pakai. Sengaja longgar (`any` terkontrol)
 * karena nama field purchase berbeda antar versi (purchaseToken / id / productId).
 * Kode pemakai (use-billing.ts) menormalkan perbedaan ini secara defensif.
 */
export interface IapModuleLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useIAP: (opts?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

let _cached: IapModuleLike | null | undefined;

/** Muat `expo-iap` lazy. null di Expo Go atau bila modul gagal dimuat. */
export function loadIap(): IapModuleLike | null {
  if (isExpoGo) return null;
  if (_cached !== undefined) return _cached;
  try {
    // require DINAMIS — tidak dievaluasi saat file di-import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    _cached = require('expo-iap') as IapModuleLike;
  } catch {
    _cached = null;
  }
  return _cached;
}

/** Apakah billing tersedia di environment ini (native module ada)? */
export function billingTersedia(): boolean {
  return loadIap() != null;
}
