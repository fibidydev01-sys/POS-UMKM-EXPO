/**
 * MenuList — daftar produk untuk kasir (SATU KOLOM, layout baris).
 *
 * PERUBAHAN:
 *   - BADGE KATEGORI DI BARIS PRODUK DIHAPUS. Kategori fungsinya hanya untuk
 *     SORTING/FILTER (via KategoriList di atas), jadi tidak perlu ditampilkan
 *     lagi di tiap baris. Baris kini hanya: nama + harga (kiri) & kontrol (kanan).
 *   - Ikon +/− memakai lucide (bukan teks "+/−").
 *
 * PERUBAHAN (FINISHING) — Audit B2 badge stok:
 *   - Prop opsional `showStok` (di-set dari features.inventory oleh kasir.tsx).
 *   - stok <= 0          → badge merah "HABIS" + kartu sedikit redup.
 *   - 0 < stok <= min    → badge kuning "SISA N" sebagai peringatan.
 *   - Produk HABIS TETAP BISA DI-TAP — sesuai Edge Case 1 PreLaunch Analysis:
 *     UMKM mungkin masih punya stok fisik walau sistem mencatat 0 (opname
 *     terlambat). Kita hanya memberi sinyal visual, bukan memblokir penjualan.
 *
 * Flow tetap:
 *   item belum di keranjang → seluruh baris pressable untuk MENAMBAH (tombol +).
 *   qty > 0 → tampil stepper −/qty/+ di kanan; baris TIDAK pressable agar tap
 *   −/+ tidak ikut memicu penambahan dari baris.
 */
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { MenuItem } from '../../lib/db/database';

interface Props {
  items: MenuItem[];
  qtyMap: Record<number, number>;
  onTambah: (item: MenuItem) => void;
  onKurang: (item: MenuItem) => void;
  bottomInset: number;
  /** Tampilkan badge stok (HABIS / SISA N). Aktif bila inventory unlocked. */
  showStok?: boolean;
}

/** Status stok produk untuk badge kasir. null = aman, tidak perlu badge. */
function statusStok(it: MenuItem): { label: string; warna: string; bg: string } | null {
  if (it.stok <= 0) {
    return { label: 'HABIS', warna: Colors.danger, bg: Colors.dangerSoft };
  }
  if (it.stok <= it.min_stock) {
    return { label: `SISA ${it.stok}`, warna: Colors.warning, bg: Colors.warningSoft };
  }
  return null;
}

export default function MenuList({
  items, qtyMap, onTambah, onKurang, bottomInset, showStok = false,
}: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => String(it.id)}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const qty = qtyMap[item.id] ?? 0;
        const aktif = qty > 0;
        const st = showStok ? statusStok(item) : null;
        const habis = showStok && item.stok <= 0;

        // Bagian kiri: nama + harga (+ badge stok bila kritis).
        const kiri = (
          <View style={styles.kiri}>
            <View style={styles.namaRow}>
              <Text style={styles.nama} numberOfLines={2}>{item.nama}</Text>
              {st && (
                <View style={[styles.stokBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.stokBadgeTeks, { color: st.warna }]}>
                    {st.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.harga}>{formatRupiah(item.harga)}</Text>
          </View>
        );

        // Bagian kanan: stepper (qty>0) atau tombol + (qty=0).
        const kanan = aktif ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => onKurang(item)} hitSlop={8} style={styles.stepBtn}>
              <Icon name="minus" size={18} color={Colors.text} strokeWidth={2.6} />
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => onTambah(item)} hitSlop={8} style={[styles.stepBtn, styles.stepPlus]}>
              <Icon name="plus" size={18} color={Colors.onPrimary} strokeWidth={2.6} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.tambahBtn}>
            <Icon name="plus" size={22} color={Colors.onPrimary} strokeWidth={2.6} />
          </View>
        );

        if (aktif) {
          return (
            <View style={[styles.card, styles.cardAktif, habis && styles.cardHabis]}>
              {kiri}
              {kanan}
            </View>
          );
        }
        // Habis tetap pressable (Edge Case 1) — hanya redup sebagai sinyal.
        return (
          <Pressable
            onPress={() => onTambah(item)}
            style={({ pressed }) => [
              styles.card,
              habis && styles.cardHabis,
              pressed && styles.pressed,
            ]}
          >
            {kiri}
            {kanan}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  cardAktif: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  // Redup tapi TETAP bisa di-tap — sinyal visual, bukan blocker.
  cardHabis: { opacity: 0.6 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  kiri: { flex: 1 },
  namaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  harga: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, marginTop: 4 },

  // Badge stok kritis (HABIS / SISA N).
  stokBadge: {
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  stokBadgeTeks: { fontSize: FontSize.xs, fontWeight: '800' },

  // Tombol + saat item belum di keranjang.
  tambahBtn: {
    width: 44, height: 44, borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },

  // Stepper saat item sudah ada di keranjang.
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 38, height: 38, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  qty: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, minWidth: 26, textAlign: 'center' },
});
