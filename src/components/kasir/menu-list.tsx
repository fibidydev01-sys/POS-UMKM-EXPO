/**
 * MenuList — daftar produk untuk kasir (SATU KOLOM, layout baris).
 *
 * PERBAIKAN LAYOUT (sesuai permintaan):
 *   - Nama + harga di KIRI, kontrol (+ / stepper) di KANAN — bukan di bawah.
 *   - Flow: item belum di keranjang → seluruh baris bisa diketuk untuk MENAMBAH
 *     (muncul tombol +). Setelah qty > 0 → tampil stepper −/qty/+ di kanan.
 *   - Saat stepper tampil, baris TIDAK pressable agar tap −/+ tidak ikut memicu
 *     penambahan dari baris.
 *
 * Badge qty tidak diperlukan lagi karena qty terlihat langsung di stepper.
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
      contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomInset }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const qty = qtyMap[item.id] ?? 0;
        const aktif = qty > 0;
        const kat = item.kategori_id ? namaKategoriMap.get(item.kategori_id) : undefined;

        // Bagian kiri: kategori (opsional), nama, harga.
        const kiri = (
          <View style={styles.kiri}>
            {!!kat && <Text style={styles.kat} numberOfLines={1}>{kat}</Text>}
            <Text style={styles.nama} numberOfLines={2}>{item.nama}</Text>
            <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>
          </View>
        );

        // Bagian kanan: stepper (qty>0) atau tombol + (qty=0).
        const kanan = aktif ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => onKurang(item)} hitSlop={8} style={styles.stepBtn}>
              <Text style={styles.stepTeks}>−</Text>
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => onTambah(item)} hitSlop={8} style={[styles.stepBtn, styles.stepPlus]}>
              <Text style={[styles.stepTeks, styles.stepTeksPlus]}>+</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tambahBtn}>
            <Text style={styles.tambahTeks}>+</Text>
          </View>
        );

        // Saat AKTIF: kartu non-pressable (tap dikendalikan tombol stepper).
        if (aktif) {
          return (
            <View style={[styles.card, styles.cardAktif]}>
              {kiri}
              {kanan}
            </View>
          );
        }
        // Saat BELUM aktif: seluruh baris pressable → menambah.
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
  kat: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700' },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: 2 },
  harga: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, marginTop: 4 },

  // Tombol + saat item belum di keranjang.
  tambahBtn: {
    width: 44, height: 44, borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },
  tambahTeks: { color: Colors.onPrimary, fontSize: 28, fontWeight: '300', lineHeight: 30, marginTop: -2 },

  // Stepper saat item sudah ada di keranjang.
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 38, height: 38, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  stepTeks: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  stepTeksPlus: { color: Colors.onPrimary },
  qty: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, minWidth: 26, textAlign: 'center' },
});
