/**
 * promo-list.tsx — Daftar promo aktif + FAB tambah promo.
 *
 * Dipecah dari app/promo.tsx (mode list).
 * Menampilkan intro text, empty state, list promo aktif via PromoRow
 * (inline sub-komponen), dan FAB floating untuk buka form tambah.
 */
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import EmptyState from '../ui/empty-state';
import type { PromoRule } from '../../lib/db/database';
import { formatTanggal } from '../../lib/utils/date';

const TIPE_LABEL: Record<string, string> = {
  bogo: 'Beli 1 Gratis 1',
  buy2get1: 'Beli 2 Gratis 1',
};

interface PromoListProps {
  aktifRules: PromoRule[];
  fabClearance: number;
  insets: EdgeInsets;
  onBukaForm: () => void;
  onNonaktif: (rule: PromoRule) => void;
}

export default function PromoList({
  aktifRules,
  fabClearance,
  insets,
  onBukaForm,
  onNonaktif,
}: PromoListProps) {
  return (
    <View style={styles.listRoot}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: fabClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Promo otomatis berlaku di kasir. Item gratis dihitung mengikuti kelipatan pembelian.
        </Text>

        {aktifRules.length === 0 ? (
          <EmptyState
            icon="gift"
            judul="Belum ada promo"
            deskripsi="Tekan tombol + di bawah untuk membuat promo pertama."
          />
        ) : (
          <View style={styles.listCard}>
            {aktifRules.map((item, i) => (
              <View key={String(item.id)}>
                <PromoRow
                  item={item}
                  onNonaktif={onNonaktif}
                />
                {i < aktifRules.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
        onPress={onBukaForm}
      >
        <Icon name="plus" size={28} color={Colors.onPrimary} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

// ── Inline sub-komponen — hanya dipakai di sini ──────────────────────────────

function PromoRow({
  item,
  onNonaktif,
}: {
  item: PromoRule;
  onNonaktif: (r: PromoRule) => void;
}) {
  return (
    <View style={styles.promoRow}>
      <View style={styles.promoKiri}>
        <Text style={styles.promoNama}>{item.nama_produk}</Text>
        <Text style={styles.promoTipe}>
          {TIPE_LABEL[item.tipe_promo] ?? item.tipe_promo}
        </Text>
        <Text style={styles.promoTgl}>
          {item.berlaku_sampai
            ? `Berlaku s/d ${formatTanggal(item.berlaku_sampai)}`
            : 'Tanpa batas waktu'}
        </Text>
      </View>
      <Pressable onPress={() => onNonaktif(item)} hitSlop={8} style={styles.nonaktifBtn}>
        <Text style={styles.nonaktifTeks}>Nonaktifkan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listRoot: { flex: 1 },
  scroll: { padding: Spacing.lg },
  intro: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
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
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  promoKiri: { flex: 1, gap: 2 },
  promoNama: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  promoTipe: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  promoTgl: { fontSize: FontSize.xs, color: Colors.textMuted },
  nonaktifBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  nonaktifTeks: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },
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
