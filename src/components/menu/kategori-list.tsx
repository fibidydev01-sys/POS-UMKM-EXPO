/**
 * KategoriList — baris chip kategori horizontal. Chip "Semua" (null) + tiap
 * kategori. Dipakai di Kasir & Menu sebagai filter.
 */
import React from 'react';
import { Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import { Kategori } from '../../lib/db/database';

interface Props {
  kategori: Kategori[];
  aktif: number | null;
  onPilih: (id: number | null) => void;
}

export default function KategoriList({ kategori, aktif, onPilih }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label="Semua" aktif={aktif === null} onPress={() => onPilih(null)} />
      {kategori.map((k) => (
        <Chip key={k.id} label={k.nama} aktif={aktif === k.id} onPress={() => onPilih(k.id)} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, aktif, onPress }: { label: string; aktif: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, aktif && styles.chipAktif, pressed && styles.pressed]}
    >
      <Text style={[styles.teks, aktif && styles.teksAktif]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingRight: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radii.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  pressed: { opacity: 0.8 },
  teks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  teksAktif: { color: Colors.onPrimary },
});
