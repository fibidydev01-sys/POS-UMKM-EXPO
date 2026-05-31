/**
 * AnalisaDiskonList — ringkasan pemakaian tiap preset diskon bulan ini.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { AnalisaDiskon } from '../../lib/db/transaksi';

interface Props { data: AnalisaDiskon[]; }

export default function AnalisaDiskonList({ data }: Props) {
  if (data.length === 0) return null;
  const totalSemua = data.reduce((s, d) => s + d.totalDiskon, 0);

  return (
    <View style={styles.card}>
      <View style={styles.judulRow}>
        <Icon name="tag" size={18} color={Colors.accent} />
        <Text style={styles.judul}>Analisa Diskon</Text>
      </View>
      <Text style={styles.subjudul}>Total diberikan bulan ini: {formatRupiah(totalSemua)}</Text>

      {data.map((d) => (
        <View key={d.nama} style={styles.row}>
          <View style={styles.kiri}>
            <Text style={styles.nama}>{d.nama}</Text>
            <Text style={styles.meta}>{d.persen}% · {d.jumlahDipakai}x dipakai</Text>
          </View>
          <Text style={styles.nominal}>{formatRupiah(d.totalDiskon)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  judulRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  subjudul: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  kiri: { flex: 1 },
  nama: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  nominal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.accent },
});
