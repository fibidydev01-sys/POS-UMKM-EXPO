/**
 * ChartOmzet — grafik batang omzet 7 hari: minggu ini vs minggu lalu.
 *
 * PERUBAHAN Phase 4.2:
 *   - Tambah early return dengan empty state saat totalIni === 0 && totalLalu === 0.
 *     Grafik kosong tidak bermakna bagi pengguna baru.
 */
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { OmzetHari } from '../../lib/db/omzet-banding';

interface Props {
  data: OmzetHari[];
  dataLalu: OmzetHari[];
}

const TOOLTIP_W = 150;

export default function ChartOmzet({ data, dataLalu }: Props) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [chartW, setChartW] = useState(0);

  const semua = [...data, ...dataLalu].map((d) => d.total);
  const maks = Math.max(1, ...semua);
  const totalIni = data.reduce((s, d) => s + d.total, 0);
  const totalLalu = dataLalu.reduce((s, d) => s + d.total, 0);
  const naik =
    totalLalu === 0
      ? totalIni > 0 ? 100 : 0
      : Math.round(((totalIni - totalLalu) / totalLalu) * 100);

  const onChartLayout = (e: LayoutChangeEvent) =>
    setChartW(e.nativeEvent.layout.width);

  const toggle = (i: number) => setAktif((prev) => (prev === i ? null : i));

  const tooltipLeft = (() => {
    if (aktif === null || chartW === 0) return 0;
    const n = data.length;
    const colCenter = ((aktif + 0.5) / n) * chartW;
    const raw = colCenter - TOOLTIP_W / 2;
    return Math.max(0, Math.min(raw, chartW - TOOLTIP_W));
  })();

  const caretLeft = (() => {
    if (aktif === null || chartW === 0) return 0;
    const n = data.length;
    const colCenter = ((aktif + 0.5) / n) * chartW;
    return Math.max(12, Math.min(colCenter - tooltipLeft, TOOLTIP_W - 12)) - 6;
  })();

  const titik = aktif !== null ? data[aktif] : null;
  const titikLalu = aktif !== null ? dataLalu[aktif] : null;

  // Empty state: belum ada transaksi sama sekali
  if (totalIni === 0 && totalLalu === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.judul}>Omzet 7 Hari</Text>
        </View>
        <Text style={styles.emptyTeks}>
          Grafik akan muncul setelah transaksi pertama tercatat.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.judul}>Omzet 7 Hari</Text>
        <View style={[styles.tren, naik >= 0 ? styles.trenUp : styles.trenDown]}>
          <Icon
            name="trending-up"
            size={12}
            color={naik >= 0 ? Colors.success : Colors.danger}
            strokeWidth={2.6}
          />
          <Text
            style={[
              styles.trenTeks,
              naik >= 0 ? styles.trenTeksUp : styles.trenTeksDown,
            ]}
          >
            {Math.abs(naik)}%
          </Text>
        </View>
      </View>
      <Text style={styles.totalBesar}>{formatRupiah(totalIni)}</Text>
      <Text style={styles.bandingTeks}>Minggu lalu: {formatRupiah(totalLalu)}</Text>

      <View style={styles.chartWrap}>
        {titik && (
          <View
            pointerEvents="none"
            style={[styles.tooltip, { left: tooltipLeft, width: TOOLTIP_W }]}
          >
            <Text style={styles.tipTanggal}>{labelTanggal(titik)}</Text>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.tipLabel}>Minggu ini</Text>
              <Text style={styles.tipNilai}>{formatRupiah(titik.total)}</Text>
            </View>
            <View style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: '#9A8E82' }]} />
              <Text style={styles.tipLabel}>Minggu lalu</Text>
              <Text style={styles.tipNilai}>{formatRupiah(titikLalu?.total ?? 0)}</Text>
            </View>
            <View style={[styles.caret, { left: caretLeft }]} />
          </View>
        )}

        <View style={styles.chart} onLayout={onChartLayout}>
          {data.map((d, i) => {
            const lalu = dataLalu[i]?.total ?? 0;
            const tIni = Math.round((d.total / maks) * 100);
            const tLalu = Math.round((lalu / maks) * 100);
            const isAktif = aktif === i;
            return (
              <Pressable
                key={d.tanggal}
                style={styles.kolom}
                onPress={() => toggle(i)}
                hitSlop={4}
              >
                <View style={[styles.bars, isAktif && styles.barsAktif]}>
                  <View
                    style={[styles.barLalu, { height: `${Math.max(tLalu, 2)}%` }]}
                  />
                  <View
                    style={[styles.barIni, { height: `${Math.max(tIni, 2)}%` }]}
                  />
                </View>
                <Text
                  style={[
                    styles.hariLabel,
                    isAktif && styles.hariLabelAktif,
                  ]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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

function labelTanggal(d: OmzetHari): string {
  const HARI_PENUH = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const date = new Date(d.tanggal.replace(' ', 'T'));
  const valid = !isNaN(date.getTime());
  const namaHari = valid ? HARI_PENUH[date.getDay()] : d.label;
  const tgl = valid ? `${date.getDate()}/${date.getMonth() + 1}` : '';
  return tgl ? `${namaHari} · ${tgl}` : namaHari;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  emptyTeks: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tren: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  trenUp: { backgroundColor: Colors.successSoft },
  trenDown: { backgroundColor: Colors.dangerSoft },
  trenTeks: { fontSize: FontSize.xs, fontWeight: '800' },
  trenTeksUp: { color: Colors.success },
  trenTeksDown: { color: Colors.danger },
  totalBesar: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  bandingTeks: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chartWrap: { marginTop: Spacing.xl, position: 'relative' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: Spacing.xs,
  },
  kolom: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 2,
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  barsAktif: { backgroundColor: Colors.primarySoft },
  barIni: {
    width: 9,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  barLalu: {
    width: 9,
    backgroundColor: Colors.borderStrong,
    borderRadius: 3,
  },
  hariLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  hariLabelAktif: { color: Colors.primary, fontWeight: '800' },
  tooltip: {
    position: 'absolute',
    bottom: 132,
    backgroundColor: '#1C140E',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 4,
    zIndex: 20,
    ...shadow(3),
  },
  tipTanggal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginBottom: 2,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 2 },
  tipLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, flex: 1 },
  tipNilai: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' },
  caret: {
    position: 'absolute',
    bottom: -5,
    width: 12,
    height: 12,
    backgroundColor: '#1C140E',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendTeks: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
