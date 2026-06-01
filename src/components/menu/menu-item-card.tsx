/**
 * MenuItemCard — kartu produk di tab Menu, dengan toggle ketersediaan & edit.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import type { MenuItem } from '../../lib/db/database';

interface Props {
  item: MenuItem;
  namaKategori?: string;
  onEdit: () => void;
  onToggle: (val: boolean) => void;
}

export default function MenuItemCard({ item, namaKategori, onEdit, onToggle }: Props) {
  const tersedia = item.is_available === 1;
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.card, !tersedia && styles.cardOff, pressed && styles.pressed]}
    >
      <View style={styles.kiri}>
        <Text style={[styles.nama, !tersedia && styles.namaOff]} numberOfLines={1}>
          {item.nama}
        </Text>
        <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>
        {!!namaKategori && <Text style={styles.kat}>{namaKategori}</Text>}
      </View>

      <Pressable
        onPress={() => onToggle(!tersedia)}
        hitSlop={8}
        style={[styles.toggle, tersedia && styles.toggleOn]}
      >
        <View style={[styles.knob, tersedia && styles.knobOn]} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  cardOff: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  kiri: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  namaOff: { textDecorationLine: 'line-through' },
  harga: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  kat: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700', marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.borderStrong, padding: 3 },
  toggleOn: { backgroundColor: Colors.success },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surface },
  knobOn: { alignSelf: 'flex-end' },
});
