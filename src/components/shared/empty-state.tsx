/**
 * EmptyState — tampilan kosong yang ramah (ikon lucide + judul + deskripsi).
 * Bisa menerima children (mis. tombol aksi).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/colors';
import type { IconName } from '../ui/icon';
import Icon from '../ui/icon';

interface Props {
  icon?: IconName;
  judul: string;
  deskripsi?: string;
  children?: React.ReactNode;
}

export default function EmptyState({ icon = 'empty-box', judul, deskripsi, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={40} color={Colors.textSubtle} strokeWidth={1.8} />
      </View>
      <Text style={styles.judul}>{judul}</Text>
      {!!deskripsi && <Text style={styles.deskripsi}>{deskripsi}</Text>}
      {!!children && <View style={styles.aksi}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  judul: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  deskripsi: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  aksi: { marginTop: Spacing.md },
});
