/**
 * DiskonInput — tombol pemicu pemilih diskon (read-only display).
 *
 * Menampilkan diskon terpilih saat ini. Mengetuk memanggil onPress; pemilih
 * diskon ditangani KeranjangPanel sebagai TUKAR-ISI di dalam sheet yang sama.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import type { DiskonPreset } from '../../lib/db/database';

interface Props {
  presets: DiskonPreset[];
  selectedId: number | null;
  selectedPersen: number;
  onPress: () => void;
}

export default function DiskonInput({ presets, selectedId, selectedPersen, onPress }: Props) {
  const aktif = selectedId !== null && selectedPersen > 0;
  const preset = aktif ? presets.find((p) => p.id === selectedId) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.box, aktif && styles.boxAktif, pressed && styles.pressed]}
    >
      <Icon name="badge-percent" size={20} color={aktif ? Colors.primaryDark : Colors.textMuted} />
      <View style={styles.kiri}>
        <Text style={styles.label}>Diskon</Text>
        <Text style={[styles.nilai, aktif && styles.nilaiAktif]} numberOfLines={1}>
          {aktif ? `${preset?.nama ?? 'Diskon'} · ${selectedPersen}%` : 'Tidak ada diskon'}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  boxAktif: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.8 },
  kiri: { flex: 1 },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  nilai: { fontSize: FontSize.md, color: Colors.text, fontWeight: '700', marginTop: 1 },
  nilaiAktif: { color: Colors.primaryDark },
});
