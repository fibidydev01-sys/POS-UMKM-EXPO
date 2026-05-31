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
 * PERUBAHAN: ikon error ⚠️ (emoji) diganti ikon vektor lucide (warning).
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import { initDatabase } from '../lib/db/database';
import { Colors, FontSize, Spacing } from '../constants/colors';
import Icon from '../components/ui/icon';

export default function RootLayout() {
  const [siap, setSiap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setSiap(true);
      } catch (e) {
        setError('Gagal menyiapkan database. Tutup dan buka kembali aplikasi.');
      }
    })();
  }, []);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="aktivasi" options={{ presentation: 'modal' }} />
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
});
