/**
 * FormMenuItem — form tambah / edit produk menu.
 *
 * Memakai <BottomSheet> (wrapper @expo/ui). Header & handle dari sheet native.
 *
 * PERUBAHAN v3 (manajemen stok):
 *   - Tambah field "Stok" & "Stok minimum".
 *   - Saat TAMBAH: field stok = stok awal produk.
 *   - Saat EDIT: field stok menampilkan stok saat ini; mengubahnya = penyesuaian
 *     manual (dicatat sebagai opname di stock_log oleh updateMenuItem).
 *   - Tombol Hapus & Simpan tetap height: 52 (konsisten drawer lain).
 *
 * PERUBAHAN v4 (bahan + resep — HYBRID):
 *   - Pemilih MODE STOK: 'Produk' (lacak stok menu, default) vs 'Resep' (stok
 *     dari bahan). Saat mode 'Resep', field stok/min disembunyikan karena stok
 *     dihitung dari bahan — isi resepnya lewat tombol "Resep" di kartu menu.
 *   - track_mode ikut dikirim di onSimpan (MenuItemInput.track_mode).
 *   - Catatan: detail resep TIDAK diisi di sini (dipisah ke ResepEditor); form ini
 *     hanya menetapkan mode. Bila user memilih 'Resep' tapi belum membuat resep,
 *     menu tetap valid — stok efektifnya 0 sampai resep & stok bahan diisi.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import BottomSheet from '../ui/bottom-sheet';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatAngka, parseRupiah } from '../../lib/utils/currency';
import type { Kategori, MenuItem, TrackMode } from '../../lib/db/database';
import type { MenuItemInput } from '../../lib/db/menu';

interface Props {
  visible: boolean;
  kategori: Kategori[];
  item?: MenuItem | null;
  onTutup: () => void;
  onSimpan: (input: MenuItemInput) => void;
  onHapus?: () => void;
}

function parseIntAman(teks: string): number {
  const digits = String(teks).replace(/[^0-9]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export default function FormMenuItem({ visible, kategori, item, onTutup, onSimpan, onHapus }: Props) {
  const [nama, setNama] = useState('');
  const [hargaStr, setHargaStr] = useState('');
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stokStr, setStokStr] = useState('0');
  const [minStokStr, setMinStokStr] = useState('5');
  const [trackMode, setTrackMode] = useState<TrackMode>('product');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNama(item?.nama ?? '');
      setHargaStr(item ? formatAngka(item.harga) : '');
      setKategoriId(item?.kategori_id ?? null);
      setIsAvailable(item ? item.is_available === 1 : true);
      setStokStr(item ? String(item.stok) : '0');
      setMinStokStr(item ? String(item.min_stock) : '5');
      setTrackMode(item?.track_mode === 'recipe' ? 'recipe' : 'product');
      setError('');
    }
  }, [visible, item]);

  const simpan = () => {
    const harga = parseRupiah(hargaStr);
    if (!nama.trim()) return setError('Nama produk wajib diisi.');
    if (harga <= 0) return setError('Harga harus lebih dari 0.');
    const stok = parseIntAman(stokStr);
    const minStock = parseIntAman(minStokStr);
    onSimpan({
      nama: nama.trim(),
      harga,
      kategori_id: kategoriId,
      is_available: isAvailable ? 1 : 0,
      // Mode 'recipe': kolom stok menu diabaikan; kirim 0/min apa adanya agar
      // tidak menimbulkan log opname yang menyesatkan (updateMenuItem hanya
      // mencatat opname untuk mode 'product').
      stok,
      min_stock: minStock,
      track_mode: trackMode,
    });
  };

  const modeRecipe = trackMode === 'recipe';

  return (
    <BottomSheet
      visible={visible}
      onClose={onTutup}
      title={item ? 'Edit Produk' : 'Tambah Produk'}
      scrollable
      snapPoints={[{ fraction: 0.9 }]}
    >
      <View style={styles.body}>
        <Text style={styles.label}>Nama Produk</Text>
        <TextInput
          value={nama}
          onChangeText={(t) => { setNama(t); setError(''); }}
          placeholder="cth: Kopi Tubruk"
          placeholderTextColor={Colors.textSubtle}
          style={styles.input}
        />

        <Text style={styles.label}>Harga</Text>
        <View style={styles.hargaWrap}>
          <Text style={styles.rp}>Rp</Text>
          <TextInput
            value={hargaStr}
            onChangeText={(t) => { setHargaStr(formatAngka(parseRupiah(t))); setError(''); }}
            placeholder="0"
            placeholderTextColor={Colors.textSubtle}
            keyboardType="number-pad"
            style={styles.inputHarga}
          />
        </View>

        {/* Pemilih mode stok (HYBRID) */}
        <Text style={styles.label}>Pelacakan Stok</Text>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => { setTrackMode('product'); setError(''); }}
            style={[styles.modeCard, !modeRecipe && styles.modeCardAktif]}
          >
            <Text style={[styles.modeJudul, !modeRecipe && styles.modeJudulAktif]}>Produk</Text>
            <Text style={[styles.modeKet, !modeRecipe && styles.modeKetAktif]}>
              Stok dihitung per produk
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setTrackMode('recipe'); setError(''); }}
            style={[styles.modeCard, modeRecipe && styles.modeCardAktif]}
          >
            <Text style={[styles.modeJudul, modeRecipe && styles.modeJudulAktif]}>Resep</Text>
            <Text style={[styles.modeKet, modeRecipe && styles.modeKetAktif]}>
              Stok dari bahan (BOM)
            </Text>
          </Pressable>
        </View>

        {modeRecipe ? (
          <Text style={styles.hint}>
            Mode resep: stok menu mengikuti ketersediaan bahan. Setelah menyimpan, atur
            bahan & jumlah per porsi lewat tombol &quot;Resep&quot; pada kartu menu.
          </Text>
        ) : (
          <>
            {/* Stok awal / saat ini + stok minimum (hanya mode produk) */}
            <View style={styles.stokRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item ? 'Stok Saat Ini' : 'Stok Awal'}</Text>
                <TextInput
                  value={stokStr}
                  onChangeText={(t) => { setStokStr(t.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="0"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stok Minimum</Text>
                <TextInput
                  value={minStokStr}
                  onChangeText={(t) => { setMinStokStr(t.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="5"
                  placeholderTextColor={Colors.textSubtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
              </View>
            </View>
            <Text style={styles.hint}>
              {item
                ? 'Mengubah stok di sini tercatat sebagai penyesuaian. Notifikasi muncul saat stok ≤ minimum.'
                : 'Notifikasi otomatis muncul saat stok produk turun hingga ≤ stok minimum.'}
            </Text>
          </>
        )}

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.katWrap}>
          <Pressable
            onPress={() => setKategoriId(null)}
            style={[styles.katChip, kategoriId === null && styles.katChipAktif]}
          >
            <Text style={[styles.katTeks, kategoriId === null && styles.katTeksAktif]}>
              Tanpa Kategori
            </Text>
          </Pressable>
          {kategori.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => setKategoriId(k.id)}
              style={[styles.katChip, kategoriId === k.id && styles.katChipAktif]}
            >
              <Text style={[styles.katTeks, kategoriId === k.id && styles.katTeksAktif]}>
                {k.nama}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.toggleRow} onPress={() => setIsAvailable(!isAvailable)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Tersedia dijual hari ini</Text>
            <Text style={styles.toggleSub}>
              Matikan jika stok habis. Bisa diaktifkan kembali besok.
            </Text>
          </View>
          <View style={[styles.toggle, isAvailable && styles.toggleOn]}>
            <View style={[styles.knob, isAvailable && styles.knobOn]} />
          </View>
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.aksiRow}>
          {item && onHapus && (
            <Pressable onPress={onHapus} style={[styles.btn, styles.btnHapus]}>
              <Text style={styles.btnHapusTeks}>Hapus</Text>
            </Pressable>
          )}
          <Pressable onPress={simpan} style={[styles.btn, styles.btnSimpan]}>
            <Text style={styles.btnSimpanTeks}>{item ? 'Simpan Perubahan' : 'Tambah Produk'}</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text,
    marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  hargaWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg,
  },
  rp: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '700', marginRight: Spacing.sm },
  inputHarga: {
    flex: 1, paddingVertical: Spacing.md,
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.text,
  },

  // Pemilih mode stok
  modeRow: { flexDirection: 'row', gap: Spacing.md },
  modeCard: {
    flex: 1, padding: Spacing.md, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  modeCardAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  modeJudul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textMuted },
  modeJudulAktif: { color: Colors.primaryDark },
  modeKet: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  modeKetAktif: { color: Colors.primary },

  stokRow: { flexDirection: 'row', gap: Spacing.md },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },
  katWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  katChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radii.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  katChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  katTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  katTeksAktif: { color: Colors.onPrimary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.lg, gap: Spacing.md,
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  toggleSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.borderStrong, padding: 3 },
  toggleOn: { backgroundColor: Colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surface },
  knobOn: { alignSelf: 'flex-end' },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },
  aksiRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },

  btn: {
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHapus: { backgroundColor: Colors.dangerSoft, paddingHorizontal: Spacing.xl },
  btnHapusTeks: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
  btnSimpan: { backgroundColor: Colors.primary, flex: 1, ...shadow(1) },
  btnSimpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
