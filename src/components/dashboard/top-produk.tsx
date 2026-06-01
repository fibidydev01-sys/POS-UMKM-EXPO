/**
 * TopProdukList — daftar produk terlaris bulan ini (qty + omzet).
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { TopProduk } from '../../lib/db/transaksi';

interface Props { data: TopProduk[]; }

export default function TopProdukList({ data }: Props) {
  const maks = Math.max(1, ...data.map((d) => d.totalQty));
  return (
    <View style={styles.card}>
      <View style={styles.judulRow}>
        <Icon name="flame" size={18} color={Colors.primary} />
        <Text style={styles.judul}>Produk Terlaris</Text>
      </View>
      <Text style={styles.subjudul}>Bulan ini</Text>

      {data.length === 0 ? (
        <Text style={styles.kosong}>Belum ada penjualan bulan ini.</Text>
      ) : (
        data.map((p, i) => (
          <View key={p.nama} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={styles.tengah}>
              <Text style={styles.nama} numberOfLines={1}>{p.nama}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.round((p.totalQty / maks) * 100)}%` }]} />
              </View>
            </View>
            <View style={styles.kanan}>
              <Text style={styles.qty}>{p.totalQty}x</Text>
              <Text style={styles.omzet}>{formatRupiah(p.totalOmzet)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  judulRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  subjudul: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, marginTop: 2 },
  kosong: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', paddingVertical: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rank: { width: 22, fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  tengah: { flex: 1, gap: 4 },
  nama: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  barBg: { height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  kanan: { alignItems: 'flex-end' },
  qty: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text },
  omzet: { fontSize: FontSize.xs, color: Colors.textMuted },
});
