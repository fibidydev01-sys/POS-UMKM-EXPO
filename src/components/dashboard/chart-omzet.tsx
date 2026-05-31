/**
 * ChartOmzet — grafik batang omzet 7 hari: minggu ini vs minggu lalu.
 * Murni View (tanpa lib chart) agar ringan & tanpa dependency tambahan.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { OmzetHari } from '../../lib/db/omzet-banding';

interface Props {
  data: OmzetHari[];     // minggu ini
  dataLalu: OmzetHari[]; // minggu lalu
}

export default function ChartOmzet({ data, dataLalu }: Props) {
  const semua = [...data, ...dataLalu].map((d) => d.total);
  const maks = Math.max(1, ...semua);
  const totalIni = data.reduce((s, d) => s + d.total, 0);
  const totalLalu = dataLalu.reduce((s, d) => s + d.total, 0);
  const naik = totalLalu === 0 ? (totalIni > 0 ? 100 : 0) : Math.round(((totalIni - totalLalu) / totalLalu) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.judul}>Omzet 7 Hari</Text>
        <View style={[styles.tren, naik >= 0 ? styles.trenUp : styles.trenDown]}>
          <Text style={[styles.trenTeks, naik >= 0 ? styles.trenTeksUp : styles.trenTeksDown]}>
            {naik >= 0 ? '▲' : '▼'} {Math.abs(naik)}%
          </Text>
        </View>
      </View>
      <Text style={styles.totalBesar}>{formatRupiah(totalIni)}</Text>
      <Text style={styles.bandingTeks}>
        Minggu lalu: {formatRupiah(totalLalu)}
      </Text>

      <View style={styles.chart}>
        {data.map((d, i) => {
          const lalu = dataLalu[i]?.total ?? 0;
          const tIni = Math.round((d.total / maks) * 100);
          const tLalu = Math.round((lalu / maks) * 100);
          return (
            <View key={d.tanggal} style={styles.kolom}>
              <View style={styles.bars}>
                <View style={[styles.barLalu, { height: `${Math.max(tLalu, 2)}%` }]} />
                <View style={[styles.barIni, { height: `${Math.max(tIni, 2)}%` }]} />
              </View>
              <Text style={styles.hariLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendTeks}>Minggu ini</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.borderStrong }]} />
          <Text style={styles.legendTeks}>Minggu lalu</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  tren: { borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  trenUp: { backgroundColor: Colors.successSoft },
  trenDown: { backgroundColor: Colors.dangerSoft },
  trenTeks: { fontSize: FontSize.xs, fontWeight: '800' },
  trenTeksUp: { color: Colors.success },
  trenTeksDown: { color: Colors.danger },
  totalBesar: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  bandingTeks: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, marginTop: Spacing.lg, gap: Spacing.xs },
  kolom: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  barIni: { width: 9, backgroundColor: Colors.primary, borderRadius: 3 },
  barLalu: { width: 9, backgroundColor: Colors.borderStrong, borderRadius: 3 },
  hariLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendTeks: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
});
