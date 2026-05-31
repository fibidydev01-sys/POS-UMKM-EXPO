import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import type { Kategori, MenuItem } from '../../lib/db/database';
import type {
  MenuItemInput} from '../../lib/db/menu';
import {
  getKategori, tambahKategori, hapusKategori,
  getMenuItems, tambahMenuItem, updateMenuItem, toggleTersedia, hapusMenuItem
} from '../../lib/db/menu';
import ScreenLayout from '../../components/ui/screen-layout';
import BottomSheet from '../../components/ui/bottom-sheet';
import Icon from '../../components/ui/icon';
import PickerRow from '../../components/ui/picker-row';
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

  const headerRight = (
    <Pressable style={styles.kelolaBtn} onPress={() => setKatVisible(true)}>
      <Text style={styles.kelolaTxt}>Kategori</Text>
    </Pressable>
  );

  const fab = (
    <Pressable style={styles.fab} onPress={bukaTambah}>
      <Icon name="plus" size={28} color={Colors.onPrimary} strokeWidth={2.6} />
    </Pressable>
  );

  return (
    <ScreenLayout
      title="Menu"
      subtitle={`${menu.length} produk · ${kategori.length} kategori`}
      headerRight={headerRight}
      bodyPadding={0}
      floating={fab}
    >
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
            icon="menu"
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

      {/* Form tambah/edit */}
      <FormMenuItem
        visible={formVisible}
        kategori={kategori}
        item={itemEdit}
        onTutup={tutupForm}
        onSimpan={simpanItem}
        onHapus={itemEdit ? hapusItem : undefined}
      />

      {/* Kelola kategori — DESAIN MIRIP PICKER DISKON (baris seragam PickerRow). */}
      <BottomSheet
        visible={katVisible}
        onClose={() => setKatVisible(false)}
        title="Kelola Kategori"
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
            contentContainerStyle={styles.katListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.katKosong}>Belum ada kategori.</Text>}
            renderItem={({ item }) => (
              <PickerRow label={item.nama} onDelete={() => konfirmasiHapusKategori(item)} />
            )}
          />
        </View>
      </BottomSheet>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  kelolaBtn: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full,
  },
  kelolaTxt: { color: Colors.accent, fontWeight: '700', fontSize: FontSize.sm },
  filterWrap: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
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

  katBody: { flex: 1, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  katList: { flex: 1 },
  katListContent: { paddingBottom: Spacing.lg },
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
});
