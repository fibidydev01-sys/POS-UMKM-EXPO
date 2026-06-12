/**
 * pengaturan/profil.tsx — Halaman Profil Usaha.
 *
 * State lokal (Opsi A): tidak pakai use-pengaturan global.
 * Data diambil saat halaman fokus, disimpan langsung ke lib/db/pengaturan.ts.
 *
 * PERUBAHAN (FINISHING) — Audit B8:
 *   - SUKSES simpan → toast.success('Profil usaha tersimpan'). Sebelumnya
 *     hanya ganti teks tombol 2 detik (terlalu subtle). Feedback tombol
 *     "✓ Tersimpan" tetap dipertahankan sebagai pelengkap.
 */
import { useState, useCallback } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Spacing } from '../../constants/colors';
import { getConfig, updateProfil } from '../../lib/db/pengaturan';
import ProfilForm from '../../components/pengaturan/profil-form';
import { useToast } from '../../components/ui/toast';

export default function ProfilScreen() {
  const toast = useToast();

  const [namaUsaha, setNamaUsaha] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [footer, setFooter] = useState('');
  const [profilTersimpan, setProfilTersimpan] = useState(false);

  const muat = useCallback(async () => {
    const c = await getConfig();
    setNamaUsaha(c.nama_umkm ?? '');
    setAlamat(c.alamat ?? '');
    setTelepon(c.no_telp ?? '');
    setFooter(c.footer_struk ?? '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat])
  );

  const simpanProfil = useCallback(async () => {
    if (!namaUsaha.trim()) {
      Alert.alert('Nama usaha wajib', 'Isi nama usaha terlebih dahulu.');
      return;
    }
    await updateProfil({
      nama_umkm: namaUsaha.trim(),
      alamat: alamat.trim(),
      no_telp: telepon.trim(),
      footer_struk: footer.trim(),
    });
    // Toast = feedback utama; teks tombol "✓ Tersimpan" = pelengkap visual.
    toast.success('Profil usaha tersimpan');
    setProfilTersimpan(true);
    setTimeout(() => setProfilTersimpan(false), 2000);
  }, [namaUsaha, alamat, telepon, footer, toast]);

  return (
    <>
      <Stack.Screen options={{ title: 'Profil Usaha' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <ProfilForm
              namaUsaha={namaUsaha}
              alamat={alamat}
              telepon={telepon}
              footer={footer}
              profilTersimpan={profilTersimpan}
              onChangeNama={setNamaUsaha}
              onChangeAlamat={setAlamat}
              onChangeTelepon={setTelepon}
              onChangeFooter={setFooter}
              onSimpan={() => { void simpanProfil(); }}
            />
          </View>
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
  },
  content: {
    gap: Spacing.md,
  },
});
