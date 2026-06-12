/**
 * uang-cepat.tsx — chip nominal cepat untuk input uang tunai. (UX Audit B3 #1)
 *
 * KENAPA KOMPONEN TERPISAH: dipakai di KeranjangPanel (drawer), dan kalau
 * halaman /kasir/keranjang punya implementasi sendiri, cukup drop-in:
 *
 *   import UangCepat from '../../components/kasir/uang-cepat';
 *   <UangCepat total={grandTotal} onPilih={(v) => setUangStr(formatAngka(v))} />
 *
 * Logika saran nominal:
 *   - "Uang Pas" selalu ada (= grandTotal).
 *   - Pecahan umum (5rb / 10rb / 20rb / 50rb / 100rb / 150rb / 200rb) yang
 *     LEBIH BESAR dari total, maksimal 3 chip.
 *   - Kalau total melebihi semua pecahan umum → fallback pembulatan ke atas
 *     kelipatan 50rb & 100rb berikutnya.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';

interface Props {
  /** Grand total transaksi. Komponen tidak render bila <= 0. */
  total: number;
  /** Callback saat chip ditekan — terima nominal angka murni. */
  onPilih: (nominal: number) => void;
}

function saranNominal(total: number): number[] {
  if (total <= 0) return [];
  const KANDIDAT = [5000, 10000, 20000, 50000, 100000, 150000, 200000];
  const hasil = KANDIDAT.filter((v) => v > total);
  if (hasil.length === 0) {
    const next50 = Math.ceil(total / 50000) * 50000;
    const next100 = Math.ceil(total / 100000) * 100000;
    [next50, next100].forEach((v) => {
      if (v > total && !hasil.includes(v)) hasil.push(v);
    });
  }
  return hasil.slice(0, 3);
}

export default function UangCepat({ total, onPilih }: Props) {
  if (total <= 0) return null;
  const saran = saranNominal(total);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPilih(total)}
        style={({ pressed }) => [styles.chip, styles.chipPas, pressed && styles.pressed]}
      >
        <Text style={styles.teksPas}>Uang Pas</Text>
      </Pressable>
      {saran.map((v) => (
        <Pressable
          key={v}
          onPress={() => onPilih(v)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.teks}>{formatRupiah(v)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipPas: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  pressed: { opacity: 0.75 },
  teks: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  teksPas: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primaryDark },
});
