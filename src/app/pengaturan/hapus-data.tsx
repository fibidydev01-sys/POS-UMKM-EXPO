/**
 * pengaturan/hapus-data.tsx — Halaman Hapus Data Saya.
 *
 * Wajib ada untuk Google Play (kebijakan penghapusan data sejak 2024).
 * Menghapus:
 *   - Data lisensi di server (Supabase: trial, kode aktivasi, IAP)
 *   - Status lisensi lokal (SecureStore + SQLite pos-license.db)
 *   - Data transaksi lokal (transaksi + transaction_item + stock_log)
 *   - Reset field lisensi di tabel pengaturan
 *
 * TIDAK menghapus: menu, kategori, preset diskon, aturan promo, profil usaha.
 * Tidak ada PG di V1 — bersih.
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { hapusSemuaData } from '../../lib/license/hapus-data';
import { muatLisensi } from '../../lib/config/features';

const YANG_DIHAPUS = [
  'Data lisensi dan aktivasi perangkat',
  'Semua riwayat transaksi penjualan',
  'Log perubahan stok',
  'Sesi & status lisensi tersimpan',
];

const YANG_TIDAK_DIHAPUS = [
  'Data menu dan produk',
  'Kategori produk',
  'Preset diskon',
  'Program promo',
  'Pengaturan profil usaha',
  'Pengaturan notifikasi & printer',
];

export default function HapusDataScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const konfirmasi = () => {
    Alert.alert(
      'Hapus Semua Data?',
      'Tindakan ini akan menghapus data lisensi dan seluruh riwayat transaksi.\n\nTindakan ini TIDAK BISA dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus Data',
          style: 'destructive',
          onPress: () => { void prosesHapus(); },
        },
      ]
    );
  };

  const prosesHapus = async () => {
    setLoading(true);
    try {
      await hapusSemuaData();
      await muatLisensi();
      Alert.alert(
        'Data Dihapus',
        'Semua data berhasil dihapus. Aplikasi akan kembali ke layar aktivasi.',
        [{ text: 'OK', onPress: () => router.replace('/aktivasi') }]
      );
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Hapus Data Saya' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning */}
        <View style={styles.warnBox}>
          <Icon name="warning" size={20} color={Colors.danger} strokeWidth={2.4} />
          <Text style={styles.warnText}>
            Penghapusan data bersifat permanen dan tidak bisa dibatalkan.
          </Text>
        </View>

        {/* Yang dihapus */}
        <Text style={styles.sectionLabel}>Yang akan dihapus</Text>
        <View style={styles.card}>
          {YANG_DIHAPUS.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <View style={styles.dotMerah} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Yang tidak dihapus */}
        <Text style={styles.sectionLabel}>Yang TIDAK dihapus</Text>
        <View style={styles.card}>
          {YANG_TIDAK_DIHAPUS.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <Icon name="check" size={14} color={Colors.success} strokeWidth={2.8} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Alternatif via email */}
        <View style={styles.altBox}>
          <Text style={styles.altTitle}>Atau kirim permintaan via email</Text>
          <Text style={styles.altText}>
            Kirim email ke{' '}
            <Text style={styles.altEmail}>admin@fibidy.com</Text>
            {'\n'}dengan subjek:{' '}
            <Text style={styles.altEmail}>"Hapus Data POS UMKM"</Text>
          </Text>
        </View>

        {/* Tombol hapus */}
        <Pressable
          onPress={konfirmasi}
          disabled={loading}
          style={({ pressed }) => [
            styles.btnHapus,
            pressed && styles.pressed,
            loading && styles.btnOff,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <>
              <Icon name="trash" size={18} color={Colors.onPrimary} />
              <Text style={styles.btnText}>Hapus Semua Data Saya</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#EFC4BC',
    marginBottom: Spacing.sm,
  },
  warnText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
    lineHeight: 19,
  },

  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...shadow(1),
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dotMerah: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
    marginTop: 7,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },

  altBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  altTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  altText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  altEmail: {
    fontWeight: '800',
  },

  btnHapus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    backgroundColor: Colors.danger,
    borderRadius: Radii.lg,
    marginTop: Spacing.xl,
    ...shadow(1),
  },
  btnText: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  pressed: { opacity: 0.9 },
  btnOff: { opacity: 0.6 },
});
