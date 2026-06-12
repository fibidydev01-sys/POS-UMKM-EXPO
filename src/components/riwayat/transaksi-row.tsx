/**
 * TransaksiRow — satu baris transaksi di FlatList Riwayat.
 *
 * Dipecah dari riwayat.tsx renderItem.
 * Menampilkan: nomor order, grand total, status badge, waktu, metode bayar, diskon.
 *
 
 */
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Badge from '../ui/badge';
import { formatRupiah } from '../../lib/utils/currency';
import { formatTanggalJam } from '../../lib/utils/date';
import type { Transaksi, PaymentMethod } from '../../lib/db/database';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  tunai:    'Tunai',
  transfer: 'Transfer',
  debit:    'Debit',
};

interface Props {
  item: Transaksi;
  onPress: () => void;
}

export default function TransaksiRow({ item, onPress }: Props) {
  const batal = item.status !== 'completed';

  return (
    <Pressable
      style={[styles.row, batal && styles.rowVoid]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.orderBadge, batal && styles.orderBadgeVoid]}>
          <Text style={[styles.orderNo, batal && styles.orderNoVoid]}>
            {item.nomor_order.split('-')[1] ?? item.nomor_order}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.totalRow}>
            <Text
              style={[styles.rowTotal, batal && styles.rowTotalVoid]}
            >
              {formatRupiah(item.grand_total)}
            </Text>
            {batal && (
              <Badge
                variant={item.status === 'refund' ? 'warning' : 'danger'}
                label={item.status === 'refund' ? 'REFUND' : 'VOID'}
              />
            )}
          </View>
          <Text style={styles.rowMeta}>
            {formatTanggalJam(item.created_at)}
            {' · '}
            {PAYMENT_LABEL[item.payment_method] ?? item.payment_method}
            {item.diskon_persen > 0
              ? ` · Diskon ${item.diskon_persen}%`
              : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow(1),
  },
  rowVoid: { opacity: 0.55 },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  orderBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  orderBadgeVoid: { backgroundColor: Colors.surfaceAlt },
  orderNo: {
    color: Colors.primaryDark,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  orderNoVoid: { color: Colors.textMuted },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTotal: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  rowTotalVoid: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
