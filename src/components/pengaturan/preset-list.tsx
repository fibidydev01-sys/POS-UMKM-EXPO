/**
 * preset-list.tsx — Daftar preset diskon + FAB tambah.
 *
 * Dipecah dari pengaturan/preset-diskon.tsx (mode list).
 * Menampilkan list preset via PickerRow atau empty state,
 * serta FAB floating untuk membuka form tambah.
 */
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import PickerRow from '../ui/picker-row';
import type { DiskonPreset } from '../../lib/db/database';

interface PresetListProps {
  presets: DiskonPreset[];
  fabClearance: number;
  insets: EdgeInsets;
  onEdit: (p: DiskonPreset) => void;
  onTambah: () => void;
}

export default function PresetList({
  presets,
  fabClearance,
  insets,
  onEdit,
  onTambah,
}: PresetListProps) {
  return (
    <View style={styles.listRoot}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: fabClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {presets.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Icon name="badge-percent" size={36} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyJudul}>Belum ada preset</Text>
            <Text style={styles.emptyKet}>
              Tekan tombol + di bawah untuk membuat preset diskon pertama.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {presets.map((p, i) => (
              <View key={p.id}>
                <PickerRow
                  label={p.nama}
                  badge={`${p.persen}%`}
                  onPress={() => onEdit(p)}
                />
                {i < presets.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
        onPress={onTambah}
      >
        <Icon name="plus" size={28} color={Colors.onPrimary} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listRoot: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.lg,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...shadow(1),
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyJudul: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  emptyKet: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(3),
    elevation: 12,
  },
});
