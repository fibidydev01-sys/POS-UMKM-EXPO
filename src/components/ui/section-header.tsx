/**
 * SectionHeader — label section dengan gaya UPPERCASE seragam.
 *
 * Mengganti sectionLabel Text yang diulang ~8x di pengaturan.tsx
 * dengan pattern persis sama (uppercase, spaced, muted).
 *
 * Cara pakai:
 *   <SectionHeader label="Profil Usaha" />
 *   <SectionHeader label="Data & Backup" style={{ marginTop: 0 }} />
 */
import { Text, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/colors';

interface SectionHeaderProps {
  label: string;
  style?: TextStyle;
}

export default function SectionHeader({ label, style }: SectionHeaderProps) {
  return (
    <Text style={[styles.label, style]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
