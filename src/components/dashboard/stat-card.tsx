/**
 * StatCard — kartu statistik ringkas. `highlight` membuat kartu primary
 * (untuk omzet hari ini).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';

interface Props {
  label: string;
  nilai: string;
  sub?: string;
  icon?: string;
  highlight?: boolean;
}

export default function StatCard({ label, nilai, sub, icon, highlight }: Props) {
  return (
    <View style={[styles.card, highlight ? styles.cardHi : styles.cardPlain]}>
      <View style={styles.head}>
        <Text style={[styles.label, highlight && styles.labelHi]}>{label}</Text>
        {!!icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={[styles.nilai, highlight && styles.nilaiHi]} numberOfLines={1} adjustsFontSizeToFit>
        {nilai}
      </Text>
      {!!sub && <Text style={[styles.sub, highlight && styles.subHi]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: Radii.lg, padding: Spacing.lg, ...shadow(1) },
  cardPlain: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  cardHi: { backgroundColor: Colors.primary },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.4 },
  labelHi: { color: 'rgba(255,255,255,0.85)' },
  icon: { fontSize: 18 },
  nilai: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  nilaiHi: { color: Colors.onPrimary },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  subHi: { color: 'rgba(255,255,255,0.85)' },
});
