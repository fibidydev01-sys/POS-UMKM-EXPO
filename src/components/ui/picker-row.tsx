/**
 * picker-row.tsx — BARIS PILIHAN seragam untuk daftar di dalam drawer.
 *
 * KENAPA: Diskon picker & Kategori (dan daftar serupa lain) harus tampil SAMA
 * agar rapi & konsisten — terutama saat jumlah item banyak. Komponen ini
 * menyatukan pola baris: [nama .... badge?] [✓ jika aktif] [hapus? opsional].
 *
 * Dipakai oleh:
 *   - keranjang-panel.tsx (pilih diskon)
 *   - menu.tsx (kelola kategori — di dalam drawer)
 *   - pengaturan.tsx (preset diskon — gaya konsisten)
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from './icon';

interface Props {
  label: string;
  /** Teks badge di kanan (mis. "10%"). Opsional. */
  badge?: string;
  /** Tandai baris terpilih (menampilkan ✓ & latar primary lembut). */
  active?: boolean;
  onPress?: () => void;
  /** Bila ada, menampilkan ikon hapus di paling kanan. */
  onDelete?: () => void;
}

export default function PickerRow({ label, badge, active, onPress, onDelete }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && onPress && styles.pressed]}
    >
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>

      {!!badge && (
        <View style={[styles.badge, active && styles.badgeActive]}>
          <Text style={[styles.badgeTxt, active && styles.badgeTxtActive]}>{badge}</Text>
        </View>
      )}

      {active && <Icon name="check" size={18} color={Colors.primary} strokeWidth={2.8} />}

      {!!onDelete && (
        <Pressable hitSlop={8} onPress={onDelete} style={styles.delBtn}>
          <Icon name="trash" size={18} color={Colors.danger} strokeWidth={2.2} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: Radii.sm,
  },
  rowActive: { backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.7 },
  label: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  labelActive: { color: Colors.primaryDark, fontWeight: '800' },
  badge: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  badgeActive: { backgroundColor: '#FFFFFF' },
  badgeTxt: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.sm },
  badgeTxtActive: { color: Colors.primaryDark },
  delBtn: { padding: 2 },
});
