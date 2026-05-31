/**
 * Layar aktivasi lisensi (offline). Masukkan kode → validasi lokal → simpan.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import InputOTP from '../components/ui/input-otp';
import { aktivasi } from '../lib/aktivasi/aktivasi';

export default function AktivasiScreen() {
  const router = useRouter();
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);

  // Format tampil: POS-XXXX-XXXX. InputOTP menangkap 8 char inti (tanpa 'POS').
  const submit = async () => {
    const full = `POS-${kode.slice(0, 4)}-${kode.slice(4, 8)}`;
    setLoading(true);
    try {
      const res = await aktivasi(full);
      if (res.ok) {
        Alert.alert('Berhasil', res.pesan, [{ text: 'Lanjut', onPress: () => router.back() }]);
      } else {
        Alert.alert('Gagal', res.pesan);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.body}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.judul}>Aktivasi Aplikasi</Text>
          <Text style={styles.deskripsi}>
            Masukkan kode aktivasi yang Anda terima. Bayar sekali, pakai selamanya — tanpa internet.
          </Text>

          <View style={styles.prefixRow}>
            <View style={styles.prefixBox}><Text style={styles.prefixTeks}>POS</Text></View>
            <Text style={styles.dash}>-</Text>
            <InputOTP length={8} value={kode} onChange={setKode} autoFocus />
          </View>

          <Pressable
            onPress={submit}
            disabled={kode.length < 8 || loading}
            style={({ pressed }) => [
              styles.btn,
              (kode.length < 8 || loading) && styles.btnOff,
              pressed && styles.pressed,
            ]}
          >
            {loading ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.btnTeks}>Aktifkan</Text>}
          </Pressable>

          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.lewati}>
            <Text style={styles.lewatiTeks}>Nanti saja</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  icon: { fontSize: 56 },
  judul: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  deskripsi: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 320, marginBottom: Spacing.lg },
  prefixRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  prefixBox: { height: 54, paddingHorizontal: Spacing.md, borderRadius: Radii.md, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
  prefixTeks: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textMuted },
  dash: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textMuted },
  btn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, alignItems: 'center', minWidth: 220, ...shadow(2) },
  btnOff: { backgroundColor: Colors.borderStrong },
  pressed: { opacity: 0.9 },
  btnTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },
  lewati: { marginTop: Spacing.md, padding: Spacing.sm },
  lewatiTeks: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSize.sm },
});
