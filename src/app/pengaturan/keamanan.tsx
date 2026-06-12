/**
 * pengaturan/keamanan.tsx — Halaman Kunci Aplikasi (Biometrik / PIN).
 *
 * State lokal. Toggle switch biometrik/PIN dengan penjelasan singkat.
 * Memakai lockAktif / setLockAktif / cekBiometrik dari lib/secure/app-lock.ts.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { lockAktif, setLockAktif, cekBiometrik } from '../../lib/secure/app-lock';

export default function KeamananScreen() {
  const [kunci, setKunci] = useState(false);
  const [biometrikTersedia, setBiometrikTersedia] = useState(true);

  const muat = useCallback(async () => {
    const [locked, cap] = await Promise.all([lockAktif(), cekBiometrik()]);
    setKunci(locked);
    setBiometrikTersedia(cap.bisa);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat])
  );

  const toggleKunci = useCallback(async (next: boolean) => {
    if (next) {
      const cap = await cekBiometrik();
      if (!cap.bisa) {
        Alert.alert(
          'Biometrik belum tersedia',
          'Aktifkan sidik jari / Face ID atau PIN di Pengaturan HP terlebih dahulu, lalu coba lagi.'
        );
        return;
      }
    }
    await setLockAktif(next);
    setKunci(next);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Kunci Aplikasi' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Kartu utama toggle */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <Icon name="key" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardJudul}>Kunci Aplikasi</Text>
              <Text style={styles.cardKet}>
                Minta verifikasi biometrik atau PIN saat membuka aplikasi
              </Text>
            </View>
            <Switch
              value={kunci}
              onValueChange={(v) => { void toggleKunci(v); }}
              trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Peringatan bila biometrik tidak tersedia */}
        {!biometrikTersedia && (
          <View style={styles.warnBox}>
            <Icon name="warning" size={16} color={Colors.warning} strokeWidth={2.4} />
            <Text style={styles.warnTeks}>
              Biometrik belum diatur di HP ini. Aktifkan sidik jari / Face ID atau PIN
              lewat Pengaturan HP agar kunci aplikasi bisa digunakan.
            </Text>
          </View>
        )}

        {/* Penjelasan */}
        <View style={styles.infoCard}>
          <Text style={styles.infoJudul}>Cara kerja kunci aplikasi</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoTeks}>
              Saat kunci aktif, aplikasi akan meminta verifikasi biometrik (sidik jari /
              Face ID) atau PIN HP setiap kali dibuka.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoTeks}>
              Melindungi data transaksi dan pengaturan kasir dari akses tidak sah
              bila HP ditinggal dalam keadaan tidak terkunci.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoTeks}>
              Kunci menggunakan autentikasi bawaan HP — aplikasi tidak menyimpan
              PIN atau data biometrik Anda.
            </Text>
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow(1),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardJudul: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  cardKet: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  warnTeks: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    lineHeight: 17,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...shadow(1),
  },
  infoJudul: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  infoTeks: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
