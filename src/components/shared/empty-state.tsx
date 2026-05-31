/**
 * EmptyState — tampilan kosong yang ramah (ikon emoji + judul + deskripsi).
 * Bisa menerima children (mis. tombol aksi).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/colors';

interface Props {
  icon?: string;
  judul: string;
  deskripsi?: string;
  children?: React.ReactNode;
}

export default function EmptyState({ icon = '📭', judul, deskripsi, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.judul}>{judul}</Text>
      {!!deskripsi && <Text style={styles.deskripsi}>{deskripsi}</Text>}
      {!!children && <View style={styles.aksi}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  icon: { fontSize: 52, marginBottom: Spacing.sm },
  judul: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  deskripsi: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  aksi: { marginTop: Spacing.md },
});
