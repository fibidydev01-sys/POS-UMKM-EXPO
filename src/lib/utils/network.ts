/**
 * network.ts — status koneksi internet (lazy expo-network, Expo Go safe).
 *
 * POLA SAMA dengan notif-module.ts / iap-module.ts / struk.ts:
 *   - require DINAMIS → app TIDAK crash bila paket `expo-network` belum
 *     terpasang di build ini.
 *   - Bila modul tidak tersedia → dianggap ONLINE (fail-open) supaya tidak
 *     pernah memblokir aktivasi hanya karena dependency hilang.
 *
 * INSTALL (sekali, sebelum build):
 *   npx expo install expo-network
 *
 * Dipakai oleh:
 *   - app/aktivasi.tsx → badge offline + pre-check sebelum network call
 *     (mulaiTrial / aktivasiKode), supaya user tidak menunggu timeout 20 detik
 *     hanya untuk tahu dia sedang offline. (UX Audit A1 & B1)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

interface NetworkModuleLike {
  getNetworkStateAsync: () => Promise<{
    isConnected?: boolean | null;
    isInternetReachable?: boolean | null;
  }>;
}

let _mod: NetworkModuleLike | null | undefined;

/** Muat expo-network lazy. null bila paket tidak ada di build ini. */
function loadNetwork(): NetworkModuleLike | null {
  if (_mod !== undefined) return _mod;
  try {
    // require DINAMIS — tidak dievaluasi saat file di-import.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    _mod = require('expo-network') as NetworkModuleLike;
  } catch {
    _mod = null;
  }
  return _mod;
}

export interface StatusJaringan {
  /** true bila modul expo-network tersedia di build ini. */
  tersedia: boolean;
  /** true bila terhubung & internet kemungkinan besar reachable. */
  online: boolean;
}

/**
 * Cek status jaringan sekali. FAIL-OPEN: bila modul tidak ada atau cek gagal,
 * dianggap online (jalur lama tetap berjalan, hanya kehilangan pre-check).
 */
export async function getStatusJaringan(): Promise<StatusJaringan> {
  const N = loadNetwork();
  if (!N) return { tersedia: false, online: true };
  try {
    const s = await N.getNetworkStateAsync();
    const connected = s.isConnected !== false;        // null → anggap true
    const reachable = s.isInternetReachable !== false; // null → anggap true
    return { tersedia: true, online: connected && reachable };
  } catch {
    return { tersedia: true, online: true };
  }
}

/**
 * Hook status jaringan untuk layar yang butuh badge offline.
 * Refresh saat: mount, app kembali active, dan tiap 7 detik selama layar hidup.
 */
export function useStatusJaringan(): StatusJaringan & { refresh: () => void } {
  const [status, setStatus] = useState<StatusJaringan>({ tersedia: false, online: true });
  const mounted = useRef(true);

  const refresh = useCallback(() => {
    void getStatusJaringan().then((s) => {
      if (mounted.current) setStatus(s);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    const timer = setInterval(refresh, 7000);
    return () => {
      mounted.current = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  return { ...status, refresh };
}
