import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { Kategori, MenuItem } from '../../lib/db/database';
import {
  getKategori, tambahKategori, hapusKategori,
  getMenuItems, tambahMenuItem, updateMenuItem, toggleTersedia, hapusMenuItem,
  MenuItemInput,
} from '../../lib/db/menu';
import BottomSheet from '../../components/ui/bottom-sheet';
import KategoriList from '../../components/menu/kategori-list';
import MenuItemCard from '../../components/menu/menu-item-card';
import FormMenuItem from '../../components/menu/form-menu-item';
import EmptyState from '../../components/shared/empty-state';

export default function MenuScreen() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [filter, setFilter] = useState<number | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [itemEdit, setItemEdit] = useState<MenuItem | null>(null);

  const [katVisible, setKatVisible] = useState(false);
  const [namaKatBaru, setNamaKatBaru] = useState('');

  const muat = useCallback(async () => {
    const [k, m] = await Promise.all([getKategori(), getMenuItems()]);
    setKategori(k);
    setMenu(m);
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const namaKategoriMap = useMemo(() => {
    const map = new Map<number, string>();
    kategori.forEach((k) => map.set(k.id, k.nama));
    return map;
  }, [kategori]);

  const menuTampil = useMemo(
    () => (filter == null ? menu : menu.filter((m) => m.kategori_id === filter)),
    [menu, filter]
  );

  const bukaTambah = () => { setItemEdit(null); setFormVisible(true); };
  const bukaEdit = (item: MenuItem) => { setItemEdit(item); setFormVisible(true); };

  const tutupForm = () => { setFormVisible(false); setItemEdit(null); };

  const simpanItem = async (input: MenuItemInput) => {
    try {
      if (itemEdit) await updateMenuItem(itemEdit.id, input);
      else await tambahMenuItem(input);
      setFormVisible(false);
      setItemEdit(null);
      await muat();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyimpan menu. Coba lagi.');
    }
  };

  const hapusItem = () => {
    if (!itemEdit) return;
    const target = itemEdit;
    Alert.alert(
      'Hapus menu?',
      `"${target.nama}" tidak akan muncul lagi di kasir.\n\nRiwayat transaksi yang sudah ada tetap tercatat.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            await hapusMenuItem(target.id);
            setFormVisible(false);
            setItemEdit(null);
            await muat();
          },
        },
      ]
    );
  };

  const ubahTersedia = async (item: MenuItem, isAvailable: boolean) => {
    setMenu((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_available: isAvailable ? 1 : 0 } : m))
    );
    await toggleTersedia(item.id, isAvailable);
  };

  const simpanKategori = async () => {
    const nama = namaKatBaru.trim();
    if (!nama) return;
    await tambahKategori(nama);
    setNamaKatBaru('');
    await muat();
  };

  const konfirmasiHapusKategori = (k: Kategori) => {
    Alert.alert(
      'Hapus kategori?',
      `"${k.nama}" dihapus. Menu di dalamnya tetap ada tanpa kategori.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            await hapusKategori(k.id);
            if (filter === k.id) setFilter(null);
            await muat();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.sub}>{menu.length} produk · {kategori.length} kategori</Text>
        </View>
        <Pressable style={styles.kelolaBtn} onPress={() => setKatVisible(true)}>
          <Text style={styles.kelolaTxt}>Kategori</Text>
        </Pressable>
      </View>

      {kategori.length > 0 && (
        <View style={styles.filterWrap}>
          <KategoriList kategori={kategori} aktif={filter} onPilih={setFilter} />
        </View>
      )}

      <FlatList
        data={menuTampil}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            namaKategori={item.kategori_id ? namaKategoriMap.get(item.kategori_id) : undefined}
            onEdit={() => bukaEdit(item)}
            onToggle={(val) => ubahTersedia(item, val)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🍽️"
            judul={menu.length === 0 ? 'Belum ada menu' : 'Tidak ada di kategori ini'}
            deskripsi={
              menu.length === 0
                ? 'Tambahkan produk pertama Anda untuk mulai berjualan.'
                : 'Pilih kategori lain atau tambah produk baru.'
            }
          >
            <Pressable style={styles.emptyBtn} onPress={bukaTambah}>
              <Text style={styles.emptyBtnTxt}>+ Tambah Menu</Text>
            </Pressable>
          </EmptyState>
        }
      />

      <Pressable style={styles.fab} onPress={bukaTambah}>
        <Text style={styles.fabTxt}>＋</Text>
      </Pressable>

      {/* Form tambah/edit */}
      <FormMenuItem
        visible={formVisible}
        kategori={kategori}
        item={itemEdit}
        onTutup={tutupForm}
        onSimpan={simpanItem}
        onHapus={itemEdit ? hapusItem : undefined}
      />

      {/* Kelola kategori */}
      <BottomSheet
        visible={katVisible}
        onClose={() => setKatVisible(false)}
        title="Kelola Kategori"
        snapPoints={['half', 'full']}
      >
        <View style={styles.katBody}>
          <View style={styles.katInputRow}>
            <TextInput
              style={styles.katInput}
              placeholder="Nama kategori baru"
              placeholderTextColor={Colors.textSubtle}
              value={namaKatBaru}
              onChangeText={setNamaKatBaru}
              onSubmitEditing={simpanKategori}
              returnKeyType="done"
            />
            <Pressable style={styles.katAddBtn} onPress={simpanKategori}>
              <Text style={styles.katAddTxt}>Tambah</Text>
            </Pressable>
          </View>

          <FlatList
            data={kategori}
            keyExtractor={(k) => String(k.id)}
            style={styles.katList}
            ListEmptyComponent={<Text style={styles.katKosong}>Belum ada kategori.</Text>}
            renderItem={({ item }) => (
              <View style={styles.katRow}>
                <Text style={styles.katNama}>{item.nama}</Text>
                <Pressable hitSlop={8} onPress={() => konfirmasiHapusKategori(item)}>
                  <Text style={styles.katHapus}>Hapus</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  kelolaBtn: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full,
  },
  kelolaTxt: { color: Colors.accent, fontWeight: '700', fontSize: FontSize.sm },
  filterWrap: { paddingBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },
  emptyBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radii.full,
  },
  emptyBtnTxt: { color: Colors.onPrimary, fontWeight: '700', fontSize: FontSize.md },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(3),
    zIndex: 20,
    elevation: 12,
  },
  fabTxt: { color: Colors.onPrimary, fontSize: 32, fontWeight: '300', marginTop: -2 },

  katBody: { flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  katList: { flex: 1 },
  katInputRow: { flexDirection: 'row', gap: Spacing.sm },
  katInput: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text,
  },
  katAddBtn: {
    backgroundColor: Colors.accent, paddingHorizontal: Spacing.lg, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  katAddTxt: { color: Colors.onPrimary, fontWeight: '700' },
  katKosong: { color: Colors.textMuted, paddingVertical: Spacing.md, textAlign: 'center' },
  katRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  katNama: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  katHapus: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },
});
