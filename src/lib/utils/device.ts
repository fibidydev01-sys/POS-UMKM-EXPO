/**
 * device.ts — identitas perangkat untuk aktivasi offline.
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

/** ID perangkat stabil (Android ID / iOS vendor ID), fallback acak tersimpan. */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const id = Application.getAndroidId?.();
      if (id) return id;
    }
    if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync?.();
      if (id) return id;
    }
  } catch {
    // abaikan; fallback di bawah
  }
  return 'dev-' + Math.random().toString(36).slice(2, 10);
}

/** Versi aplikasi dari native build. */
export function getAppVersion(): string {
  return Application.nativeApplicationVersion ?? '1.0.0';
}
