/**
 * MenuList — daftar produk untuk kasir (SATU KOLOM, layout baris).
 *
 * PERUBAHAN:
 *   - BADGE KATEGORI DI BARIS PRODUK DIHAPUS. Kategori fungsinya hanya untuk
 *     SORTING/FILTER (via KategoriList di atas), jadi tidak perlu ditampilkan
 *     lagi di tiap baris. Baris kini hanya: nama + harga (kiri) & kontrol (kanan).
 *   - Ikon +/− memakai lucide (bukan teks "+/−").
 *
 * Flow tetap:
 *   item belum di keranjang → seluruh baris pressable untuk MENAMBAH (tombol +).
 *   qty > 0 → tampil stepper −/qty/+ di kanan; baris TIDAK pressable agar tap
 *   −/+ tidak ikut memicu penambahan dari baris.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { MenuItem } from '../../lib/db/database';

interface Props {
  items: MenuItem[];
  qtyMap: Record<number, number>;
  onTambah: (item: MenuItem) => void;
  onKurang: (item: MenuItem) => void;
  bottomInset: number;
}

export default function MenuList({
  items, qtyMap, onTambah, onKurang, bottomInset,
}: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => String(it.id)}
      contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomInset }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const qty = qtyMap[item.id] ?? 0;
        const aktif = qty > 0;

        // Bagian kiri: nama + harga (TANPA badge kategori).
        const kiri = (
          <View style={styles.kiri}>
            <Text style={styles.nama} numberOfLines={2}>{item.nama}</Text>
            <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>
          </View>
        );

        // Bagian kanan: stepper (qty>0) atau tombol + (qty=0).
        const kanan = aktif ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => onKurang(item)} hitSlop={8} style={styles.stepBtn}>
              <Icon name="minus" size={18} color={Colors.text} strokeWidth={2.6} />
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => onTambah(item)} hitSlop={8} style={[styles.stepBtn, styles.stepPlus]}>
              <Icon name="plus" size={18} color={Colors.onPrimary} strokeWidth={2.6} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.tambahBtn}>
            <Icon name="plus" size={22} color={Colors.onPrimary} strokeWidth={2.6} />
          </View>
        );

        if (aktif) {
          return (
            <View style={[styles.card, styles.cardAktif]}>
              {kiri}
              {kanan}
            </View>
          );
        }
        return (
          <Pressable
            onPress={() => onTambah(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {kiri}
            {kanan}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...shadow(1),
  },
  cardAktif: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  kiri: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  harga: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, marginTop: 4 },

  // Tombol + saat item belum di keranjang.
  tambahBtn: {
    width: 44, height: 44, borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },

  // Stepper saat item sudah ada di keranjang.
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 38, height: 38, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  qty: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, minWidth: 26, textAlign: 'center' },
});
