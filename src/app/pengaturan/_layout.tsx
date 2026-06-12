/**
 * pengaturan/_layout.tsx — Stack navigator untuk sub-pages Pengaturan.
 *
 * Menyediakan header native dengan back button bertuliskan "Pengaturan"
 * untuk semua halaman di dalam folder pengaturan/.
 *
 * PERUBAHAN (KONSISTENSI):
 *   - Tambah headerShadowVisible: false agar tidak ada garis bawah header
 *     yang kontras dengan background krem Colors.bg. Hasil: header menyatu
 *     mulus dengan konten halaman.
 */
import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function PengaturanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Pengaturan',
        headerStyle: { backgroundColor: Colors.bg },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '800', color: Colors.text },
        contentStyle: { backgroundColor: Colors.bg },
      }}
    />
  );
}
