/**
 * LaporanBahan — kartu ringkasan stok BAHAN untuk DASHBOARD (Beranda).
 *
 * Sejajar dengan LaporanStok (produk), tapi membaca BahanReport. Menampilkan
 * nilai stok bahan, jumlah SKU, bahan menipis & habis, serta daftar ringkas
 * bahan paling kritis. Tombol "Kelola" memicu callback membuka sheet BahanKelola.
 *
 * Presentational murni: data via props (BahanReport). Satuan ikut ditampilkan
 * karena tiap bahan punya satuan sendiri.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { BahanReport } from '../../lib/db/bahan';

interface Props {
  data: BahanReport;
  onKelola?: () => void;
}

const MAKS_BARIS = 4;

function fmtReal(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

export default function LaporanBahan({ data, onKelola }: Props) {
  const kritis = data.items.filter((it) => it.menipis); // termasuk habis
  const tampil = kritis.slice(0, MAKS_BARIS);
  const sisa = kritis.length - tampil.length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.judulRow}>
          <Icon name="empty-box" size={18} color={Colors.accent} />
          <Text style={styles.judul}>Stok Bahan</Text>
        </View>
        {onKelola && (
          <Pressable onPress={onKelola} hitSlop={8} style={styles.kelolaBtn}>
            <Text style={styles.kelolaTeks}>Kelola</Text>
            <Icon name="chevron-right" size={16} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      {data.totalSku === 0 ? (
        <View style={styles.amanRow}>
          <Icon name="empty-box" size={16} color={Colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.kosongTeks}>
            Belum ada bahan. Tambah bahan & buat resep menu agar stok bahan terlacak.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>NILAI STOK</Text>
              <Text style={styles.statNilai} numberOfLines={1} adjustsFontSizeToFit>
                {formatRupiah(data.totalNilai)}
              </Text>
              <Text style={styles.statSub}>{data.totalSku} bahan</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>MENIPIS</Text>
              <Text style={[styles.statNilai, data.jumlahMenipis > 0 && { color: Colors.warning }]}>
                {data.jumlahMenipis}
              </Text>
              <Text style={styles.statSub}>perlu perhatian</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>HABIS</Text>
              <Text style={[styles.statNilai, data.jumlahHabis > 0 && { color: Colors.danger }]}>
                {data.jumlahHabis}
              </Text>
              <Text style={styles.statSub}>stok kosong</Text>
            </View>
          </View>

          {kritis.length === 0 ? (
            <View style={styles.amanRow}>
              <Icon name="check" size={16} color={Colors.success} strokeWidth={2.6} />
              <Text style={styles.amanTeks}>Semua bahan aman di atas batas minimum.</Text>
            </View>
          ) : (
            <View style={styles.daftar}>
              {tampil.map((it) => (
                <View key={it.id} style={styles.kritisRow}>
                  <View style={[styles.dot, { backgroundColor: it.habis ? Colors.danger : Colors.warning }]} />
                  <Text style={styles.kritisNama} numberOfLines={1}>{it.nama}</Text>
                  <Text style={[styles.kritisStok, { color: it.habis ? Colors.danger : Colors.warning }]}>
                    {it.habis ? 'Habis' : `Sisa ${fmtReal(it.stok)} ${it.satuan}`}
                  </Text>
                </View>
              ))}
              {sisa > 0 && <Text style={styles.sisaTeks}>+{sisa} bahan lain perlu dicek</Text>}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  judulRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  kelolaBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kelolaTeks: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' },

  statRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.4 },
  statNilai: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: 4 },
  statSub: { fontSize: 10, color: Colors.textSubtle, marginTop: 2 },

  amanRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, backgroundColor: Colors.successSoft, borderRadius: Radii.md, padding: Spacing.md },
  amanTeks: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600', flex: 1 },
  kosongTeks: { fontSize: FontSize.sm, color: Colors.textMuted, flex: 1, lineHeight: 18 },

  daftar: { marginTop: Spacing.md, gap: Spacing.xs },
  kritisRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kritisNama: { flex: 1, fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  kritisStok: { fontSize: FontSize.sm, fontWeight: '800' },
  sisaTeks: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, fontStyle: 'italic' },
});
