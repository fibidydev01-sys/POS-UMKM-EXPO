/**
 * menu-header-actions.tsx — Tombol aksi header tab Menu.
 *
 * Lapis 3 DIHAPUS: tombol "Bahan" dihapus.
 * V1: hanya "Kategori"
 * V2: "Stok" + "Kategori"
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/colors';

interface Props {
  showInventory: boolean;
  onStok: () => void;
  onKategori: () => void;
}

export default function MenuHeaderActions({ showInventory, onStok, onKategori }: Props) {
  return (
    <View style={styles.row}>
      {showInventory && (
        <Pressable onPress={onStok} hitSlop={8} style={styles.btn}>
          <Text style={styles.teks}>Stok</Text>
        </Pressable>
      )}
      <Pressable onPress={onKategori} hitSlop={8} style={styles.btn}>
        <Text style={styles.teks}>Kategori</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  btn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
  },
  teks: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primaryDark },
});
