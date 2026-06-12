/**
 * kasir/_layout.tsx — Stack navigator untuk sub-pages Kasir.
 *
 * Route group ini menampung:
 *   kasir/index.tsx    → halaman pilih produk (dipanggil dari tab kasir)
 *   kasir/keranjang.tsx → halaman keranjang (menggantikan KeranjangPanel drawer)
 *
 * Header disembunyikan — kasir dan keranjang punya header sendiri via ScreenLayout.
 */
import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function KasirLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
