/**
 * Root layout — membungkus seluruh app.
 *
 * Setelah drop V2: rekonsiliasi QRIS dihapus total.
 * Tidak ada import reconcile, tidak ada features.qris check.
 */
import { useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { View, ActivityIndicator, StyleSheet, Text, Pressable, AppState } from 'react-native';
import { Stack, router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import type * as Notifications from 'expo-notifications';
import { initDatabase } from '../lib/db/database';
import { muatLisensi, features } from '../lib/config/features';
import { sentuhJam } from '../lib/license';
import { lockAktif, mintaAuth } from '../lib/secure/app-lock';
import { initNotifications } from '../lib/notification';
import { loadNotifications } from '../lib/notification/notif-module';
import { ToastProvider } from '../components/ui/toast';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import Icon from '../components/ui/icon';

function useNotificationObserver(aktif: boolean) {
  useEffect(() => {
    if (!aktif) return;
    const N = loadNotifications();
    if (!N) return;
    let mounted = true;
    function redirect(notification: Notifications.Notification) {
      const target = notification.request.content.data?.target;
      if (target === 'stok') router.push('/(tabs)' as Href);
    }
    void N.getLastNotificationResponseAsync().then(
      (response: Notifications.NotificationResponse | null) => {
        if (mounted && response?.notification) redirect(response.notification);
      }
    );
    const sub = N.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => redirect(response.notification)
    );
    return () => { mounted = false; sub.remove(); };
  }, [aktif]);
}

export default function RootLayout() {
  const [siap, setSiap]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [perluUnlock, setPerluUnlock] = useState(false);
  const [terbuka, setTerbuka]       = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useNotificationObserver(siap && features.inventory);

  useEffect(() => {
    void (async () => {
      try {
        await initDatabase();
        await muatLisensi();
        const locked = await lockAktif();
        if (locked) {
          setPerluUnlock(true);
          const ok = await mintaAuth('Buka aplikasi kasir');
          setTerbuka(ok);
        }
        setSiap(true);
        if (features.inventory) void initNotifications();
      } catch {
        setError('Gagal menyiapkan database. Tutup dan buka kembali aplikasi.');
      }
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void sentuhJam().then(() => muatLisensi());
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
            <ActivityIndicator
              color={Colors.primary} size="large"
              style={{ marginTop: Spacing.lg }}
            />
          </View>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
            <Pressable
              onPress={cobaBukaLagi}
              style={({ pressed }) => [styles.unlockBtn, pressed && styles.pressed]}
            >
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
          <ToastProvider>
            <Stack screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg },
            }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="aktivasi" options={{ presentation: 'modal' }} />
              <Stack.Screen name="pengaturan" options={{ headerShown: false }} />
              <Stack.Screen name="menu"       options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" />
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg, padding: Spacing.xl,
  },
  brand:   { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  errIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  errText:  { fontSize: FontSize.md, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  lockIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  lockHint: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  unlockBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl,
    minWidth: 220, alignItems: 'center', ...shadow(2),
  },
  unlockTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },
  pressed:    { opacity: 0.9 },
});
