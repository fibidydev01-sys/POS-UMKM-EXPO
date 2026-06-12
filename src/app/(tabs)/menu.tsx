/**
 * (tabs)/menu.tsx — Tab Menu: daftar produk + filter + FAB tambah.
 *
 * PERUBAHAN (RESTORE + UPDATE):
 *   - Tab ini kembali VISIBLE di tab bar (bukan hidden lagi).
 *   - headerRight: pakai MenuHeaderActions (bukan inline JSX).
 *   - FAB: pakai useSafeAreaInsets untuk bottom dinamis.
 *   - paddingBottom list memperhitungkan FAB + tab bar agar tidak tertutup.
 *
 * Lapis 3 DIHAPUS:
 *   - MenuResepBar dihapus (tidak ada tombol Resep per kartu)
 *   - onBahan dihapus dari MenuHeaderActions
 *   - cardWrap + gap dihapus (tidak ada sub-komponen di bawah kartu)
 *
 * Entry point aksi:
 *   Floating bar (+)     → /menu/tambah-produk (tambah produk baru)
 *   Tap kartu produk     → /menu/tambah-produk?id=X (edit)
 *   Header "Kategori"    → /menu/kategori
 *   Header "Stok" (V2)   → /menu/stok
 */
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, FontSize, shadow } from '../../constants/colors';
import { features } from '../../lib/config/features';
import { useMenu } from '../../hooks/use-menu';
import ScreenLayout from '../../components/ui/screen-layout';
import Icon from '../../components/ui/icon';
import EmptyState from '../../components/ui/empty-state';
import KategoriList from '../../components/menu/kategori-list';
import MenuItemCard from '../../components/menu/menu-item-card';
import MenuHeaderActions from '../../components/pengaturan/menu-header-actions';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showInventory = features.inventory;
  const m = useMenu();

  // Clearance bawah list: tab bar + safe area + floating bar + gap
  const TAB_BAR = 60;
  const FAB_SIZE = 60;
  const LIST_BOTTOM_PADDING = TAB_BAR + insets.bottom + FAB_SIZE + Spacing.lg;

  // Floating bar bottom: di atas tab bar + safe area
  const FAB_BOTTOM = insets.bottom;

  return (
    <ScreenLayout
      title="Menu"
      subtitle={`${m.menu.length} produk · ${m.kategori.length} kategori`}
      headerRight={
        <MenuHeaderActions
          showInventory={showInventory}
          onStok={() => router.push('/menu/stok' as Href)}
          onKategori={() => router.push('/menu/kategori' as Href)}
        />
      }
      bodyPadding={0}
    >
      {/* Filter kategori horizontal */}
      {m.kategori.length > 0 && (
        <View style={styles.filterWrap}>
          <KategoriList
            kategori={m.kategori}
            aktif={m.filter}
            onPilih={m.setFilter}
          />
        </View>
      )}

      {/* Daftar produk */}
      <FlatList
        data={m.menuTampil}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={[styles.list, { paddingBottom: LIST_BOTTOM_PADDING }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            namaKategori={
              item.kategori_id
                ? m.namaKategoriMap.get(item.kategori_id)
                : undefined
            }
            onEdit={() =>
              router.push(`/menu/tambah-produk?id=${item.id}` as Href)
            }
            onToggle={(val) => { void m.ubahTersedia(item, val); }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="menu"
            judul={
              m.menu.length === 0
                ? 'Belum ada menu'
                : 'Tidak ada di kategori ini'
            }
            deskripsi={
              m.menu.length === 0
                ? 'Tekan tombol + di bawah untuk menambahkan produk pertama.'
                : 'Pilih kategori lain atau tekan + untuk tambah produk baru.'
            }
          />
        }
      />

      {/* Floating bar tambah produk — mirip cartBar di kasir */}
      <Pressable
        onPress={() => router.push('/menu/tambah-produk' as Href)}
        style={({ pressed }) => [
          styles.fabBar,
          { bottom: FAB_BOTTOM },
          pressed && styles.fabBarPressed,
        ]}
      >
        <Text style={styles.fabBarLabel}>Tambah Produk</Text>
        <View style={styles.fabBarIcon}>
          <Icon name="plus" size={20} color={Colors.onPrimary} strokeWidth={2.6} />
        </View>
      </Pressable>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    paddingLeft: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  fabBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    ...shadow(3),
    zIndex: 20,
    elevation: 12,
  },
  fabBarPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  fabBarLabel: {
    flex: 1,
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  fabBarIcon: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});