import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import type { MenuItem } from '../../lib/db/database';

interface Props {
  items: MenuItem[];
  qtyMap: Record<number, number>; // id -> qty di keranjang
  onTambah: (item: MenuItem) => void;
  numColumns: number;
}

/** Grid produk. Tiap kartu menampilkan badge qty bila sudah di keranjang. */
export default function MenuGrid({ items, qtyMap, onTambah, numColumns }: Props) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const qty = qtyMap[item.id] ?? 0;
        return (
          <View key={item.id} style={[styles.cell, { width: `${100 / numColumns}%` }]}>
            <Pressable
              onPress={() => onTambah(item)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed, qty > 0 && styles.cardAktif]}
            >
              {qty > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTeks}>{qty}</Text>
                </View>
              )}
              <View style={styles.thumb}>
                <Text style={styles.thumbHuruf}>{item.nama.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.nama} numberOfLines={2}>{item.nama}</Text>
              <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { padding: Spacing.xs },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 130,
    ...shadow(1),
  },
  cardAktif: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  badge: {
    position: 'absolute', top: -6, right: -6, zIndex: 2,
    backgroundColor: Colors.primary, minWidth: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    borderWidth: 2, borderColor: Colors.surface, ...shadow(2),
  },
  badgeTeks: { color: Colors.onPrimary, fontSize: FontSize.xs, fontWeight: '800' },
  thumb: {
    width: 40, height: 40, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  thumbHuruf: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  nama: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, flex: 1 },
  harga: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary, marginTop: Spacing.xs },
});
