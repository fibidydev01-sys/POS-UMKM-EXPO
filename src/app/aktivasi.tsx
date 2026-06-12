/**
 * aktivasi.tsx — layar aktivasi & trial terpadu.
 *
 * Setelah drop V2: tidak ada tier, tidak ada TIER_LABEL.
 * Beli / aktivasi → semua fitur aktif. Pesan sukses sederhana.
 *
 * PERUBAHAN (FINISHING / UX AUDIT A1 + B1):
 *   - Badge status koneksi: tampil saat OFFLINE, sebelum user tap apa pun.
 *     Pakai useStatusJaringan() (expo-network, lazy & fail-open — bila paket
 *     belum terpasang, badge tidak pernah muncul dan flow lama tetap jalan).
 *   - PRE-CHECK koneksi sebelum mulaiTrial() / aktivasiKode() → feedback
 *     INSTAN saat offline, tidak menunggu timeout 20 detik.
 *   - Error trial & kode jadi INLINE TEXT merah (bukan Alert berat) + border
 *     merah pada input kode. Alert hanya dipakai untuk pesan SUKSES karena
 *     tombolnya memicu navigasi.
 *   - Format mask kode otomatis: huruf besar + tanda hubung tiap 4 karakter
 *     (pola UMKM-XXXX-XXXX). Kalau format kode lisensi berubah dari pola
 *     4-4-4, sesuaikan fungsi maskKode() di bawah.
 *   - Teks progress saat loading: "Menghubungi server…" / "Memeriksa kode…"
 *     (bukan spinner polos).
 *   - Banner trial sisa ≤ 3 hari → gaya WARNING (kuning) agar user aware.
 */
import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import Icon from '../components/ui/icon';
import { features, muatLisensi, licenseSnapshot } from '../lib/config/features';
import { mulaiTrial, aktivasiKode, useBilling } from '../lib/license';
import { getStatusJaringan, useStatusJaringan } from '../lib/utils/network';

/**
 * Mask kode lisensi: huruf besar, hanya A-Z0-9, tanda hubung otomatis tiap
 * 4 karakter, maksimal 12 karakter inti (UMKM-XXXX-XXXX).
 */
function maskKode(raw: string): string {
  const inti = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const grup = inti.match(/.{1,4}/g) ?? [];
  return grup.join('-');
}

export default function AktivasiScreen() {
  const router = useRouter();
  const jaringan = useStatusJaringan();

  const [snapAwal] = useState(() => licenseSnapshot());
  const [bisaLewati] = useState(() => !features.locked);
  const forcedRef = useRef(!bisaLewati);

  const [kode, setKode] = useState('');
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingKode, setLoadingKode]   = useState(false);
  const [trialError, setTrialError]     = useState('');
  const [kodeError, setKodeError]       = useState('');

  // Offline = modul network tersedia DAN terdeteksi tidak ada internet.
  const offline = jaringan.tersedia && !jaringan.online;

  const selesai = useCallback(async () => {
    await muatLisensi();
    if (forcedRef.current) {
      if (!features.locked) router.replace('/(tabs)');
    } else {
      router.back();
    }
  }, [router]);

  const billing = useBilling({
    onSukses: () => {
      Alert.alert('Berhasil', 'Semua fitur aktif permanen.', [
        { text: 'Lanjut', onPress: () => { void selesai(); } },
      ]);
    },
  });

  const onMulaiTrial = async () => {
    setTrialError('');
    // PRE-CHECK: feedback instan saat offline (tanpa menunggu timeout server).
    const net = await getStatusJaringan();
    if (net.tersedia && !net.online) {
      setTrialError('Tidak ada koneksi internet. Sambungkan dulu, lalu coba lagi.');
      jaringan.refresh();
      return;
    }
    setLoadingTrial(true);
    try {
      const r = await mulaiTrial();
      if (r.ok) {
        Alert.alert('Trial Aktif', r.pesan, [
          { text: 'Mulai', onPress: () => { void selesai(); } },
        ]);
      } else {
        setTrialError(r.pesan);
      }
    } finally {
      setLoadingTrial(false);
    }
  };

  const onAktivasiKode = async () => {
    const k = kode.trim();
    if (!k) return;
    setKodeError('');
    const net = await getStatusJaringan();
    if (net.tersedia && !net.online) {
      setKodeError('Tidak ada koneksi internet. Sambungkan dulu, lalu coba lagi.');
      jaringan.refresh();
      return;
    }
    setLoadingKode(true);
    try {
      const r = await aktivasiKode(k);
      if (r.ok) {
        Alert.alert('Berhasil', r.pesan, [
          { text: 'Lanjut', onPress: () => { void selesai(); } },
        ]);
      } else {
        setKodeError(r.pesan);
      }
    } finally {
      setLoadingKode(false);
    }
  };

  const trialExpired    = snapAwal.kind === 'trial' && !snapAwal.trialActive;
  const belumAktivasi   = snapAwal.kind === 'none';
  const bisaMulaiTrial  = belumAktivasi;

  const banner = (() => {
    if (snapAwal.kind === 'paid') {
      return {
        ikon: 'key' as const,
        warna: Colors.primary,
        bg: Colors.primarySoft,
        judul: 'Lisensi aktif — semua fitur tersedia',
        teks: 'Terima kasih telah membeli aplikasi.',
      };
    }
    if (snapAwal.trialActive) {
      // Trial sisa ≤ 3 hari → warning kuning agar user segera ambil keputusan.
      const hampirHabis = snapAwal.trialSisaHari <= 3;
      if (hampirHabis) {
        return {
          ikon: 'warning' as const,
          warna: Colors.warning,
          bg: Colors.warningSoft,
          judul: `Trial hampir habis — sisa ${snapAwal.trialSisaHari} hari`,
          teks: 'Aktifkan kode lisensi atau beli via Google Play sekarang agar kasir tidak terkunci.',
        };
      }
      return {
        ikon: 'key' as const,
        warna: Colors.primary,
        bg: Colors.primarySoft,
        judul: `Trial aktif — sisa ${snapAwal.trialSisaHari} hari`,
        teks: 'Nikmati semua fitur. Beli sebelum trial berakhir agar tetap berjalan.',
      };
    }
    if (trialExpired) {
      return {
        ikon: 'warning' as const,
        warna: Colors.danger,
        bg: Colors.dangerSoft,
        judul: 'Masa trial telah berakhir',
        teks: 'Aktifkan kode lisensi atau beli via Google Play untuk melanjutkan.',
      };
    }
    return {
      ikon: 'key' as const,
      warna: Colors.primary,
      bg: Colors.primarySoft,
      judul: 'Coba gratis 30 hari',
      teks: 'Tanpa kartu kredit. Aktifkan trial untuk mulai memakai aplikasi.',
    };
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Icon name="key" size={40} color={Colors.primary} strokeWidth={2.2} />
          </View>

          <Text style={styles.judul}>Aktivasi Aplikasi</Text>
          <Text style={styles.subtitle}>
            Kasir offline untuk warung, toko, dan kafe Indonesia.{'\n'}
            Tanpa internet saat berjualan. Tanpa biaya bulanan.
          </Text>

          {/* Badge OFFLINE — tampil sebelum user tap apa pun (UX Audit A1) */}
          {offline && (
            <View style={styles.offlineBadge}>
              <Icon name="wifi-off" size={16} color={Colors.danger} strokeWidth={2.4} />
              <Text style={styles.offlineTeks}>
                Tidak ada koneksi internet. Trial & aktivasi kode membutuhkan
                koneksi — berjualan setelahnya tetap full offline.
              </Text>
            </View>
          )}

          <View style={[styles.banner, { backgroundColor: banner.bg }]}>
            <Icon name={banner.ikon} size={20} color={banner.warna} strokeWidth={2.4} />
            <View style={styles.flex}>
              <Text style={[styles.bannerJudul, { color: banner.warna }]}>
                {banner.judul}
              </Text>
              <Text style={styles.bannerTeks}>{banner.teks}</Text>
            </View>
          </View>

          {bisaMulaiTrial && (
            <>
              <Pressable
                onPress={() => { void onMulaiTrial(); }}
                disabled={loadingTrial || offline}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && styles.pressed,
                  (loadingTrial || offline) && styles.btnOff,
                ]}
              >
                {loadingTrial ? (
                  <>
                    <ActivityIndicator color={Colors.onPrimary} />
                    <Text style={styles.btnPrimaryTeks}>Menghubungi server…</Text>
                  </>
                ) : (
                  <Text style={styles.btnPrimaryTeks}>Mulai Trial 30 Hari Gratis</Text>
                )}
              </Pressable>
              {offline && (
                <Text style={styles.hintOffline}>
                  Butuh internet untuk memulai trial.
                </Text>
              )}
              {!!trialError && <Text style={styles.errorInline}>{trialError}</Text>}
            </>
          )}

          <Text style={styles.sectionLabel}>Punya Kode Lisensi?</Text>
          <View style={styles.card}>
            <View style={[styles.kodeRow, !!kodeError && styles.kodeRowError]}>
              <Icon
                name="key"
                size={18}
                color={kodeError ? Colors.danger : Colors.textMuted}
              />
              <TextInput
                style={styles.kodeInput}
                value={kode}
                onChangeText={(t) => { setKode(maskKode(t)); setKodeError(''); }}
                placeholder="cth: UMKM-XXXX-XXXX"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={14}
                onSubmitEditing={() => { void onAktivasiKode(); }}
              />
            </View>
            {!!kodeError && <Text style={styles.errorInline}>{kodeError}</Text>}
            <Pressable
              onPress={() => { void onAktivasiKode(); }}
              disabled={kode.trim().length === 0 || loadingKode}
              style={({ pressed }) => [
                styles.btnOutline,
                pressed && styles.pressed,
                (kode.trim().length === 0 || loadingKode) && styles.btnOffOutline,
              ]}
            >
              {loadingKode ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.btnOutlineTeks}>Memeriksa kode…</Text>
                </View>
              ) : (
                <Text style={styles.btnOutlineTeks}>Aktifkan Kode</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Beli via Google Play</Text>
          <View style={styles.card}>
            {!billing.tersedia ? (
              <Text style={styles.playNote}>
                Pembelian dalam aplikasi hanya tersedia di aplikasi yang terpasang
                dari Google Play (bukan Expo Go). Build APK/AAB untuk mengaktifkan.
              </Text>
            ) : billing.produk.length === 0 ? (
              <View style={styles.playLoadingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.playNote}>Memuat produk dari Google Play…</Text>
              </View>
            ) : (
              billing.produk.map((prod) => (
                <Pressable
                  key={prod.id}
                  onPress={() => { void billing.beli(prod.id); }}
                  disabled={billing.proses}
                  style={({ pressed }) => [
                    styles.playBtn,
                    pressed && styles.pressed,
                    billing.proses && styles.btnOff,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.playJudul}>{prod.judul}</Text>
                    <Text style={styles.playId}>Semua fitur aktif permanen</Text>
                  </View>
                  <Text style={styles.playHarga}>{prod.harga || '—'}</Text>
                </Pressable>
              ))
            )}

            {billing.tersedia && (
              <Pressable
                onPress={() => { void billing.pulihkan(); }}
                hitSlop={8}
                style={styles.pulihkan}
                disabled={billing.proses}
              >
                <Text style={styles.pulihkanTeks}>Pulihkan pembelian</Text>
              </Pressable>
            )}

            {!!billing.error && (
              <>
                <Text style={styles.error}>{billing.error}</Text>
                {billing.tersedia && (
                  <Text style={styles.playNote}>
                    Sudah membeli sebelumnya? Tap{' '}
                    <Text style={styles.pulihkanHint}>
                      &#34;Pulihkan pembelian&#34;
                    </Text>
                    {' '}di atas.
                  </Text>
                )}
              </>
            )}

            {billing.proses && (
              <View style={styles.playLoadingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.playNote}>Memproses pembelian…</Text>
              </View>
            )}
          </View>

          {bisaLewati && (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.lewati}>
              <Text style={styles.lewatiTeks}>Nanti saja</Text>
            </Pressable>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  flex:    { flex: 1 },
  spacer:  { height: Spacing.xl },
  scroll:  { padding: Spacing.xl },
  iconWrap: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  judul: {
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg,
  },
  offlineBadge: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.dangerSoft, borderRadius: Radii.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#EFC4BC',
  },
  offlineTeks: {
    flex: 1, fontSize: FontSize.xs, color: Colors.danger,
    fontWeight: '600', lineHeight: 17,
  },
  banner: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start',
    borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  bannerJudul: { fontSize: FontSize.md, fontWeight: '800' },
  bannerTeks:  { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2, lineHeight: 19 },
  sectionLabel: {
    fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    ...shadow(1), gap: Spacing.md,
  },
  btnPrimary: {
    height: 54, backgroundColor: Colors.primary, borderRadius: Radii.lg,
    flexDirection: 'row', gap: Spacing.sm,
    alignItems: 'center', justifyContent: 'center', ...shadow(2),
  },
  btnPrimaryTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },
  btnOff: { opacity: 0.6 },
  hintOffline: {
    fontSize: FontSize.xs, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.sm,
  },
  errorInline: {
    color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600',
    marginTop: Spacing.sm, lineHeight: 19,
  },
  kodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  kodeRowError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  kodeInput: {
    flex: 1, paddingVertical: Spacing.md,
    fontSize: FontSize.md, fontWeight: '700', color: Colors.text, letterSpacing: 1,
  },
  btnOutline: {
    height: 48, backgroundColor: Colors.bg, borderRadius: Radii.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnOutlineTeks:  { color: Colors.primary, fontWeight: '800', fontSize: FontSize.md },
  btnOffOutline:   { opacity: 0.5 },
  btnLoadingRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bg, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.border,
  },
  playJudul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  playId:    { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  playHarga: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  playNote:  { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19, flex: 1 },
  playLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pulihkan:     { alignSelf: 'center', paddingVertical: Spacing.sm },
  pulihkanTeks: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },
  pulihkanHint: { fontWeight: '800', color: Colors.primary },
  error:  { color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600' },
  pressed: { opacity: 0.9 },
  lewati:  { marginTop: Spacing.lg, padding: Spacing.sm, alignSelf: 'center' },
  lewatiTeks: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSize.sm },
});
