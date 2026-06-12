/**
 * Badge — status badge reusable.
 *
 * Mengganti duplikasi inline badge di:
 *   - stok-opname.tsx    (HABIS / MENIPIS)
 *   - bahan-kelola.tsx   (HABIS / MENIPIS)
 *   - riwayat.tsx        (VOID / REFUND)
 *   - pembayaran.tsx     (AKTIF) — V2
 *
 * Gunakan variant sesuai konteks:
 *   danger  → HABIS, VOID
 *   warning → MENIPIS, REFUND
 *   success → AKTIF, aman
 *   primary → info utama
 *   muted   → nonaktif, abu-abu
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';

interface BadgeProps {
  variant: 'danger' | 'warning' | 'success' | 'primary' | 'muted';
  label: string;
  size?: 'sm' | 'xs';
}

const VARIANT_COLORS: Record<
  BadgeProps['variant'],
  { bg: string; text: string }
> = {
  danger:  { bg: Colors.dangerSoft,  text: Colors.danger },
  warning: { bg: Colors.warningSoft, text: Colors.warning },
  success: { bg: Colors.successSoft, text: Colors.success },
  primary: { bg: Colors.primarySoft, text: Colors.primaryDark },
  muted:   { bg: Colors.surfaceAlt,  text: Colors.textMuted },
};

export default function Badge({ variant, label, size = 'xs' }: BadgeProps) {
  const colors = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text
        style={[
          styles.label,
          { color: colors.text },
          size === 'sm' && styles.labelSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  labelSm: {
    fontSize: FontSize.sm,
  },
});
