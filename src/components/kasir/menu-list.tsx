/**
 * MenuList — grid produk untuk kasir. Ketuk kartu / tombol + untuk menambah,
 * tombol − untuk mengurangi. Badge qty muncul saat item ada di keranjang.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { MenuItem } from '../../lib/db/database';

interface Props {
  items: MenuItem[];
  qtyMap: Record<number, number>;
  namaKategoriMap: Map<number, string>;
  onTambah: (item: MenuItem) => void;
  onKurang: (item: MenuItem) => void;
  bottomInset: number;
}

export default function MenuList({
  items, qtyMap, namaKategoriMap, onTambah, onKurang, bottomInset,
}: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => String(it.id)}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomInset }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const qty = qtyMap[item.id] ?? 0;
        const aktif = qty > 0;
        const kat = item.kategori_id ? namaKategoriMap.get(item.kategori_id) : undefined;

        const isi = (
          <>
            {!!kat && <Text style={styles.kat} numberOfLines={1}>{kat}</Text>}
            <Text style={styles.nama} numberOfLines={2}>{item.nama}</Text>
            <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>

            {aktif ? (
              <View style={styles.stepper}>
                <Pressable onPress={() => onKurang(item)} hitSlop={6} style={styles.stepBtn}>
                  <Text style={styles.stepTeks}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{qty}</Text>
                <Pressable onPress={() => onTambah(item)} hitSlop={6} style={[styles.stepBtn, styles.stepPlus]}>
                  <Text style={[styles.stepTeks, styles.stepTeksPlus]}>+</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.tambahHint}>
                <Text style={styles.tambahHintTeks}>+ Tambah</Text>
              </View>
            )}
          </>
        );

        // Saat item aktif (stepper tampil), kartu TIDAK pressable agar tap pada
        // tombol −/+ tidak ikut memicu penambahan dari kartu. Saat belum ada di
        // keranjang, seluruh kartu bisa diketuk untuk menambah.
        if (aktif) {
          return <View style={[styles.card, styles.cardAktif]}>{isi}</View>;
        }
        return (
          <Pressable
            onPress={() => onTambah(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {isi}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  row: { gap: Spacing.md },
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
    minHeight: 132, justifyContent: 'space-between', ...shadow(1),
  },
  cardAktif: { borderColor: Colors.primary },
  pressed: { opacity: 0.9 },
  kat: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700' },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: 2 },
  harga: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, marginTop: Spacing.sm },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  stepBtn: {
    width: 34, height: 34, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  stepTeks: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  stepTeksPlus: { color: Colors.onPrimary },
  qty: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  tambahHint: {
    marginTop: Spacing.md, backgroundColor: Colors.primarySoft, borderRadius: Radii.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  tambahHintTeks: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.sm },
});
