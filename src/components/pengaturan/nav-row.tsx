/**
 * nav-row.tsx — Baris navigasi bergaya "Settings" untuk tab Pengaturan.
 *
 * Dipecah dari (tabs)/pengaturan.tsx agar screen tab tetap tipis.
 * Dipakai oleh semua NavRow di halaman Pengaturan utama.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import type { IconName } from '../ui/icon';

export interface NavRowProps {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function NavRow({ icon, title, subtitle, onPress }: NavRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navTitle}>{title}</Text>
        <Text style={styles.navSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  navRowPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  navSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
