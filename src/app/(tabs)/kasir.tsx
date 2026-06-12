/**
 * (tabs)/kasir.tsx — Tab Kasir: pilih produk.
 *
 * REFACTOR: useKasir hook lokal diganti useKasirStore (Zustand).
 * State cart tetap hidup saat navigate ke halaman keranjang dan kembali.
 *
 * Cart bar floating → router.push('/kasir/keranjang') (bukan drawer lagi).
 * StrukPreview tetap modal di sini, dipicu dari store.strukVisible.
 *
 * PERUBAHAN (FINISHING):
 *   - cetak() memakai cetakStrukKePrinter() — SATU pemanggilan (tidak lagi
 *     getPairedDevices + connectPrinter + cetakStruk yang ambil device list 2x).
 *     Pesan error kini menyebut Bluetooth secara eksplisit (tidak menyesatkan
 *     saat BT mati), dan nama printer dikembalikan untuk feedback.
 *   - Cetak BERHASIL → toast.success dengan nama printer ("Struk terkirim ke
 *     TM-m10."). Sebelumnya sukses tidak ada feedback sama sekali.
 *   - MenuList menerima showStok={features.inventory} → badge HABIS / SISA N
 *     pada produk yang stoknya kritis (Audit B2).
 *
 * PERUBAHAN (RESTRUKTUR):
 *   - Cart bar kini SELALU tampil (tidak conditional), sama seperti FAB di menu.
 *   - TAB_BAR_BASE + tabBarHeight dihapus, diganti struktur sama persis menu.
 *   - cartBarBottom = insets.bottom (1:1 dengan FAB_BOTTOM di menu).
 *   - LIST_BOTTOM_PADDING memperhitungkan FAB + tab bar agar tidak tertutup.
 */
import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { cetakStrukKePrinter, printerTersedia } from '../../lib/printer/struk';
import { features } from '../../lib/config/features';
import { useKasirStore } from '../../store/kasir-store';
import { useState } from 'react';

import ScreenLayout from '../../components/ui/screen-layout';
import MenuList from '../../components/kasir/menu-list';
import StrukPreview from '../../components/kasir/struk-preview';
import KategoriList from '../../components/menu/kategori-list';
import EmptyState from '../../components/ui/empty-state';
import Icon from '../../components/ui/icon';
import { useToast } from '../../components/ui/toast';

export default function KasirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [mencetak, setMencetak] = useState(false);

  // Clearance bawah list: tab bar + safe area + floating bar + gap
  const TAB_BAR = 60;
  const FAB_SIZE = 60;
  const LIST_BOTTOM_PADDING = TAB_BAR + insets.bottom + FAB_SIZE + Spacing.lg;

  // Floating bar bottom: di atas tab bar + safe area
  const FAB_BOTTOM = insets.bottom;

  // Zustand store
  const {
    menu,
    kategori,
    kategoriAktif,
    config,
    menuTampil,
    qtyMap,
    grandTotal,
    totalQty,
    trxSelesai,
    itemsSelesai,
    strukVisible,
    muat,
    tambah,
    kurang,
    setKategoriAktif,
    tutupStruk,
  } = useKasirStore();

  // Reload menu setiap kali tab dapat fokus
  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat]),
  );

  const cetak = async () => {
    if (!config || !trxSelesai) return;
    if (!printerTersedia()) {
      Alert.alert(
        'Printer tidak tersedia',
        'Cetak struk hanya berjalan di build Android dengan printer bluetooth.',
      );
      return;
    }
    setMencetak(true);
    try {
      // Satu pintu: cari device + cetak + dapat nama printer.
      const res = await cetakStrukKePrinter(config, trxSelesai, itemsSelesai);
      if (res.ok) {
        toast.success(res.pesan); // "Struk terkirim ke <nama printer>."
      } else {
        Alert.alert('Gagal cetak', res.pesan);
      }
    } finally {
      setMencetak(false);
    }
  };

  const cartBar = (
    <Pressable
      onPress={() => router.push('/kasir/keranjang' as Href)}
      style={({ pressed }) => [
        styles.cartBar,
        { bottom: FAB_BOTTOM },
        pressed && styles.cartPressed,
      ]}
    >
      <View style={styles.cartBadge}>
        <Text style={styles.cartBadgeTeks}>{totalQty}</Text>
      </View>
      <Text style={styles.cartLabel}>Lihat Keranjang</Text>
      <Text style={styles.cartTotal}>{formatRupiah(grandTotal)}</Text>
    </Pressable>
  );

  return (
    <ScreenLayout
      title="Kasir"
      subtitle="Pilih produk untuk mulai transaksi"
      bodyPadding={0}
      floating={cartBar}
    >
      {menu.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Icon name="menu" size={40} color={Colors.textSubtle} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyJudul}>Belum ada produk</Text>
          <Pressable
            style={styles.btnTambah}
            onPress={() => router.push('/(tabs)/menu' as Href)}
          >
            <Icon name="plus" size={18} color={Colors.onPrimary} strokeWidth={2.6} />
            <Text style={styles.btnTambahTeks}>Tambah Produk</Text>
          </Pressable>
          <Text style={styles.emptyDesc}>
            Tambahkan produk terlebih dahulu agar bisa mulai berjualan.
          </Text>
        </View>
      ) : (
        <>
          {kategori.length > 0 && (
            <View style={styles.kategoriBar}>
              <KategoriList
                kategori={kategori}
                aktif={kategoriAktif}
                onPilih={setKategoriAktif}
              />
            </View>
          )}
          {menuTampil.length === 0 ? (
            <EmptyState
              icon="search"
              judul="Tidak ada di kategori ini"
              deskripsi="Pilih kategori lain untuk melihat produk yang tersedia."
            />
          ) : (
            <MenuList
              items={menuTampil}
              qtyMap={qtyMap}
              onTambah={tambah}
              onKurang={kurang}
              bottomInset={LIST_BOTTOM_PADDING}
              showStok={features.inventory}
            />
          )}
        </>
      )}

      {/* StrukPreview tetap modal, dipicu dari store */}
      <StrukPreview
        visible={strukVisible}
        config={config}
        trx={trxSelesai}
        items={itemsSelesai}
        mencetak={mencetak}
        onCetak={() => { void cetak(); }}
        onSelesai={tutupStruk}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyJudul: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  btnTambah: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    height: 52,
    borderRadius: Radii.md,
    ...shadow(2),
  },
  btnTambahTeks: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  kategoriBar: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
  cartBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    ...shadow(3),
    zIndex: 20,
    elevation: 12,
  },
  cartPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cartBadgeTeks: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  cartLabel: {
    flex: 1,
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  cartTotal: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.lg,
  },
});