/**
 * LebarKertas — selector lebar kertas struk 58mm / 80mm.
 *
 * Dipecah dari pengaturan.tsx.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';

interface LebarKertasProps {
  value: 58 | 80;
  onChange: (v: 58 | 80) => void;
}

export default function LebarKertas({ value, onChange }: LebarKertasProps) {
  return (
    <View style={styles.card}>
      <View style={styles.lebarRow}>
        {([58, 80] as const).map((w) => (
          <Pressable
            key={w}
            onPress={() => onChange(w)}
            style={[styles.lebarBtn, value === w && styles.lebarBtnAktif]}
          >
            <Text
              style={[styles.lebarTxt, value === w && styles.lebarTxtAktif]}
            >
              {w} mm
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow(1),
  },
  lebarRow: { flexDirection: 'row', gap: Spacing.md },
  lebarBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  lebarBtnAktif: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  lebarTxt: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  lebarTxtAktif: { color: Colors.primaryDark },
});
