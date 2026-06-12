/**
 * pengaturan/bantuan.tsx — Halaman FAQ & Bantuan.
 *
 * Pertanyaan umum yang akan dicek Google reviewer saat testing app.
 * Disarankan (bukan wajib) tapi meningkatkan user experience secara signifikan.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: 'Bagaimana cara memulai trial gratis?',
    a: 'Buka tab Pengaturan → Tentang Aplikasi → Aktivasi & Lisensi → tap "Mulai Trial 30 Hari Gratis". Dibutuhkan koneksi internet sekali saat aktivasi — setelah itu bisa dipakai penuh tanpa internet.',
  },
  {
    q: 'Apakah POS UMKM butuh internet saat berjualan?',
    a: 'Tidak. Setelah aktivasi, seluruh fitur kasir, menu, stok, dan laporan berjalan 100% offline. Koneksi internet hanya dibutuhkan saat aktivasi trial/lisensi pertama kali.',
  },
  {
    q: 'Bagaimana cara membeli lisensi permanen?',
    a: 'Buka Pengaturan → Tentang Aplikasi → Aktivasi & Lisensi → pilih produk "POS Plus" di bagian Google Play. Pembelian sekali bayar, permanen — bukan langganan, tidak ada tagihan bulanan.',
  },
  {
    q: 'Bagaimana jika ganti atau reset HP?',
    a: 'Jika punya akun Google Play yang sama, tap "Pulihkan pembelian" di layar Aktivasi untuk memulihkan lisensi. Untuk data transaksi, selalu backup via Pengaturan → Backup & Restore sebelum ganti HP.',
  },
  {
    q: 'Cara menghubungkan printer struk Bluetooth?',
    a: 'Pair printer thermal (58mm/80mm) di Pengaturan HP → Bluetooth terlebih dahulu. Setelah transaksi berhasil di kasir, tap tombol "Cetak Struk". Printer hanya tersedia di build Android — tidak berjalan di emulator.',
  },
  {
    q: 'Bagaimana cara backup dan restore data?',
    a: 'Buka Pengaturan → Backup & Restore. Export akan membuat file Excel (.xlsx) yang bisa disimpan ke Google Drive atau dikirim via WhatsApp. Import akan memulihkan data dari file backup tersebut.',
  },
  {
    q: 'Apakah data saya aman jika aplikasi diuninstall?',
    a: 'Data tersimpan lokal di perangkat. Jika aplikasi diuninstall tanpa backup, data transaksi hilang permanen. Selalu lakukan backup rutin via fitur Export Excel di Pengaturan.',
  },
  {
    q: 'Bagaimana cara mengaktifkan kode lisensi?',
    a: 'Buka Pengaturan → Tentang Aplikasi → Aktivasi & Lisensi → masukkan kode berformat UMKM-XXXX-XXXX di kolom "Punya Kode Lisensi?" lalu tap "Aktifkan Kode".',
  },
  {
    q: 'Masih ada masalah yang belum terselesaikan?',
    a: 'Hubungi support di admin@fibidy.com dengan menjelaskan masalah dan versi aplikasi (cek di Pengaturan → Tentang Aplikasi).',
  },
];

export default function BantuanScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Bantuan & FAQ' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Pertanyaan yang sering ditanyakan pengguna POS UMKM.
        </Text>

        {FAQ.map((item, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.qRow}>
              <View style={styles.qBadge}>
                <Text style={styles.qBadgeTeks}>Q</Text>
              </View>
              <Text style={styles.pertanyaan}>{item.q}</Text>
            </View>
            <Text style={styles.jawaban}>{item.a}</Text>
          </View>
        ))}

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
  intro: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.xs,
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
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  qBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  qBadgeTeks: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  pertanyaan: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 21,
  },
  jawaban: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
