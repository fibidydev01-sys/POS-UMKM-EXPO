/**
 * StatCard — kartu statistik ringkas.
 *
 * DIPINDAH: components/dashboard/stat-card.tsx → components/ui/stat-card.tsx
 * Update import di: src/app/(tabs)/index.tsx
 *
 * PERUBAHAN Phase 5.1: tambah minimumFontScale={0.7} agar angka besar
 * tidak terpotong di layar kecil.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import type { IconName } from './icon';
import Icon from './icon';

interface Props {
  label: string;
  nilai: string;
  sub?: string;
  icon?: IconName;
  highlight?: boolean;
}

export default function StatCard({ label, nilai, sub, icon, highlight }: Props) {
  const iconColor = highlight ? 'rgba(255,255,255,0.9)' : Colors.primary;
  return (
    <View style={[styles.card, highlight ? styles.cardHi : styles.cardPlain]}>
      <View style={styles.head}>
        <Text style={[styles.label, highlight && styles.labelHi]}>{label}</Text>
        {!!icon && <Icon name={icon} size={18} color={iconColor} />}
      </View>
      <Text
        style={[styles.nilai, highlight && styles.nilaiHi]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {nilai}
      </Text>
      {!!sub && <Text style={[styles.sub, highlight && styles.subHi]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: Radii.lg, padding: Spacing.lg, ...shadow(1) },
  cardPlain: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHi: { backgroundColor: Colors.primary },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.4,
    flex: 1,
  },
  labelHi: { color: 'rgba(255,255,255,0.85)' },
  nilai: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  nilaiHi: { color: Colors.onPrimary },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  subHi: { color: 'rgba(255,255,255,0.85)' },
});
