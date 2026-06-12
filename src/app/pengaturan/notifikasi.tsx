/**
 * pengaturan/notifikasi.tsx — Halaman Notifikasi Stok. V2 only.
 *
 * Wrapper halaman untuk NotifSettingsSection yang sudah ada di
 * src/components/pengaturan/notif-settings.tsx.
 *
 * Pola identik dengan sub-pages lain (profil, keamanan, backup):
 *   Fragment → Stack.Screen → ScrollView → konten
 *
 * Tidak ada state di sini — semua state & logic ada di NotifSettingsSection.
 * Halaman ini murni shell: header + scroll wrapper.
 *
 * Gating: halaman ini hanya bisa diakses dari NavRow yang sudah di-gate
 * dengan features.inventory di (tabs)/pengaturan.tsx.
 * Tidak perlu guard tambahan di sini.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Spacing } from '../../constants/colors';
import NotifSettingsSection from '../../components/pengaturan/notif-settings';

export default function NotifikasiScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Notifikasi Stok' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <NotifSettingsSection />
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
  },
});
