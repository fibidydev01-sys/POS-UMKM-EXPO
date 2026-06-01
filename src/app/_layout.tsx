/**
 * Root layout — membungkus seluruh app.
 *
 * Drawer memakai @expo/ui (sheet NATIVE). Urutan provider:
 *   GestureHandlerRootView
 *     └─ SafeAreaProvider
 *          └─ BottomSheetModalProvider  (dari @expo/ui — kompatibilitas API)
 *               └─ Stack (expo-router)
 *
 * initDatabase() dijalankan sekali sebelum render konten.
 *
 * PERUBAHAN (QRIS local-first):
 *   - muatTierDariDb() dipanggil setelah initDatabase agar feature flags (QRIS,
 *     promo, refund) mengikuti tier (env sebagai lantai, aktivasi bisa menaikkan).
 *   - rekonsiliasi() dijalankan saat START dan saat app kembali FOREGROUND
 *     (Phase 2 — pengganti ketahanan webhook).
 *   - Gerbang kunci aplikasi (biometrik/PIN) opsional saat cold start (Phase 4).
 *     mintaAuth() mengembalikan true bila perangkat tak punya biometrik, sehingga
 *     pengguna TIDAK terkunci keluar.
 *   - Route 'pembayaran' (setup PG) didaftarkan di Stack.
 *
 * CATATAN: ikon error ⚠️ (emoji) tetap memakai ikon vektor lucide (warning).
 */
import { useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { View, ActivityIndicator, StyleSheet, Text, Pressable, AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import { initDatabase } from '../lib/db/database';
import { muatTierDariDb } from '../lib/config/features';
import { rekonsiliasi } from '../lib/payment/reconcile';
import { lockAktif, mintaAuth } from '../lib/secure/app-lock';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import Icon from '../components/ui/icon';

export default function RootLayout() {
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kunci aplikasi (Phase 4). perluUnlock=true bila lock aktif; terbuka=true
  // setelah autentikasi berhasil (atau perangkat tanpa biometrik → fallback).
  const [perluUnlock, setPerluUnlock] = useState(false);
  const [terbuka, setTerbuka] = useState(false);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void (async () => {
      try {
        await initDatabase();
        await muatTierDariDb();

        // Phase 4 — gerbang kunci aplikasi (opsional).
        const locked = await lockAktif();
        if (locked) {
          setPerluUnlock(true);
          const ok = await mintaAuth('Buka aplikasi kasir');
          setTerbuka(ok);
        }

        setSiap(true);

        // Phase 2 — rekonsiliasi sesi pending saat START.
        void rekonsiliasi();
      } catch (e) {
        setError('Gagal menyiapkan database. Tutup dan buka kembali aplikasi.');
      }
    })();
  }, []);

  // Phase 2 — rekonsiliasi saat app kembali ke FOREGROUND (background → active).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void rekonsiliasi();
      }
    });
    return () => sub.remove();
  }, []);

  const cobaBukaLagi = () => {
    void (async () => {
      const ok = await mintaAuth('Buka aplikasi kasir');
      if (ok) setTerbuka(true);
    })();
  };

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.center}>
            <View style={styles.errIcon}>
              <Icon name="warning" size={40} color={Colors.danger} strokeWidth={2.2} />
            </View>
            <Text style={styles.errText}>{error}</Text>
          </View>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!siap) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.center}>
            <Text style={styles.brand}>POS UMKM</Text>
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: Spacing.lg }} />
          </View>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Phase 4 — layar terkunci. Hanya muncul bila kunci aktif & belum terbuka.
  if (perluUnlock && !terbuka) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.center}>
            <View style={styles.lockIcon}>
              <Icon name="key" size={40} color={Colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.brand}>Aplikasi Terkunci</Text>
            <Text style={styles.lockHint}>Verifikasi identitas untuk melanjutkan.</Text>
            <Pressable onPress={cobaBukaLagi} style={({ pressed }) => [styles.unlockBtn, pressed && styles.pressed]}>
              <Text style={styles.unlockTeks}>Buka Kunci</Text>
            </Pressable>
          </View>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="aktivasi" options={{ presentation: 'modal' }} />
            <Stack.Screen name="pembayaran" />
            <Stack.Screen name="promo" options={{ headerShown: true, title: 'Program Promo' }} />
          </Stack>
          <StatusBar style="dark" />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, padding: Spacing.xl },
  brand: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  errIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errText: { fontSize: FontSize.md, color: Colors.text, textAlign: 'center', lineHeight: 22 },

  // Layar terkunci (Phase 4)
  lockIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  lockHint: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  unlockBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, minWidth: 220,
    alignItems: 'center', ...shadow(2),
  },
  unlockTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },
  pressed: { opacity: 0.9 },
});
