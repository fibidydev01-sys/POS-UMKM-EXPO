/**
 * ResepEditor — sheet editor RESEP/BOM untuk satu menu.
 *
 * Dibuka dari kartu menu (tab Menu). Menampilkan baris resep menu + tambah bahan
 * (pilih bahan + qty per porsi) + edit/hapus baris. Pola TUKAR-ISI:
 *   'list' → daftar bahan dalam resep + ringkasan HPP per porsi
 *   'tambah' → pilih bahan (yang belum dipakai) + qty
 *
 * PERBAIKAN SCROLL: daftar & form memakai BottomSheetScrollView (re-export
 * @expo/ui) agar bisa di-scroll di dalam sheet native. Lihat expo/expo#46379.
 *
 * INTEGRASI MODE (HYBRID):
 *   - Begitu resep berisi ≥1 bahan → menu otomatis di-set track_mode='recipe'
 *     (stok menu diturunkan dari bahan saat jualan).
 *   - Bila semua baris dihapus → menu dikembalikan ke track_mode='product'
 *     (kembali memakai kolom stok menu seperti semula).
 *   Perubahan mode disimpan via updateMenuItem; perubahan diberitahukan ke parent
 *   lewat onPerubahan agar daftar menu & dashboard ikut menyegarkan.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '../ui/bottom-sheet';
import Icon from '../ui/icon';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import type { Bahan, MenuItem } from '../../lib/db/database';
import type { ResepLine } from '../../lib/db/resep';
import {
  getResepByMenu, setResepLine, hapusResepLine, getBahanBelumDipakai,
} from '../../lib/db/resep';
import { updateMenuItem } from '../../lib/db/menu';
import { useToast } from '../ui/toast';

type Mode = 'list' | 'tambah';

interface Props {
  visible: boolean;
  menu: MenuItem | null;
  onTutup: () => void;
  /** Dipanggil setelah resep/mode berubah agar parent memuat ulang. */
  onPerubahan?: () => void;
}

function parseReal(teks: string): number {
  const bersih = String(teks).replace(',', '.').replace(/[^0-9.]/g, '');
  if (!bersih) return 0;
  const n = parseFloat(bersih);
  return Number.isFinite(n) ? n : 0;
}
function fmtReal(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

export default function ResepEditor({ visible, menu, onTutup, onPerubahan }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('list');
  const [lines, setLines] = useState<ResepLine[]>([]);
  const [tersedia, setTersedia] = useState<Bahan[]>([]);

  // form tambah
  const [bahanDipilihId, setBahanDipilihId] = useState<number | null>(null);
  const [qtyStr, setQtyStr] = useState('');
  const [err, setErr] = useState('');

  // edit qty inline (baris yang sedang diedit)
  const [editId, setEditId] = useState<number | null>(null);
  const [editQtyStr, setEditQtyStr] = useState('');

  const muat = useCallback(async () => {
    if (!menu) return;
    const [l, b] = await Promise.all([getResepByMenu(menu.id), getBahanBelumDipakai(menu.id)]);
    setLines(l);
    setTersedia(b);
  }, [menu]);

  useEffect(() => {
    if (visible && menu) {
      void muat();
      setMode('list');
      setEditId(null);
    }
  }, [visible, menu, muat]);

  // HPP (perkiraan biaya bahan) per porsi = Σ qty × harga_beli bahan.
  const hpp = useMemo(() => lines.reduce((s, l) => s + l.qty * l.harga_beli, 0), [lines]);

  /** Sinkronkan track_mode menu mengikuti ada/tidaknya baris resep. */
  const sinkronMode = useCallback(async (jumlahBaris: number) => {
    if (!menu) return;
    const modeBaru = jumlahBaris > 0 ? 'recipe' : 'product';
    if (menu.track_mode === modeBaru) return; // tidak berubah
    await updateMenuItem(menu.id, {
      nama: menu.nama,
      harga: menu.harga,
      kategori_id: menu.kategori_id,
      is_available: menu.is_available,
      stok: menu.stok,
      min_stock: menu.min_stock,
      track_mode: modeBaru,
    });
  }, [menu]);

  const tambah = async () => {
    if (!menu) return;
    if (bahanDipilihId == null) { setErr('Pilih bahan dulu.'); return; }
    const qty = parseReal(qtyStr);
    if (!(qty > 0)) { setErr('Qty per porsi harus lebih dari 0.'); return; }
    try {
      await setResepLine(menu.id, bahanDipilihId, qty);
      await sinkronMode(lines.length + 1);
      setBahanDipilihId(null);
      setQtyStr('');
      setErr('');
      await muat();
      onPerubahan?.();
      setMode('list');
      toast.success('Bahan ditambahkan ke resep');
    } catch {
      setErr('Gagal menyimpan. Coba lagi.');
    }
  };

  const simpanEdit = async (l: ResepLine) => {
    const qty = parseReal(editQtyStr);
    if (!(qty > 0)) { toast.warning('Qty harus lebih dari 0'); return; }
    if (!menu) return;
    await setResepLine(menu.id, l.bahan_id, qty);
    setEditId(null);
    await muat();
    onPerubahan?.();
  };

  const hapus = async (l: ResepLine) => {
    await hapusResepLine(l.resep_id);
    const sisa = lines.length - 1;
    await sinkronMode(sisa);
    await muat();
    onPerubahan?.();
    toast.info(`"${l.nama}" dihapus dari resep`);
  };

  const judul = mode === 'tambah' ? 'Tambah Bahan ke Resep' : 'Resep Menu';
  const headerRight =
    mode === 'tambah' ? (
      <Pressable onPress={() => setMode('list')} hitSlop={8} style={styles.linkRow}>
        <Icon name="chevron-left" size={18} color={Colors.primary} />
        <Text style={styles.link}>Resep</Text>
      </Pressable>
    ) : tersedia.length > 0 ? (
      <Pressable onPress={() => { setErr(''); setMode('tambah'); }} hitSlop={8} style={styles.linkRow}>
        <Icon name="plus" size={16} color={Colors.primary} strokeWidth={2.8} />
        <Text style={styles.linkBold}>Tambah</Text>
      </Pressable>
    ) : undefined;

  return (
    <BottomSheet visible={visible} onClose={onTutup} title={judul} headerRight={headerRight} scrollable={false}>
      {mode === 'list' ? (
        <View style={styles.flex}>
          <View style={styles.kepala}>
            <Text style={styles.menuNama} numberOfLines={1}>{menu?.nama ?? ''}</Text>
            <Text style={styles.menuSub}>
              {menu?.track_mode === 'recipe'
                ? 'Mode: stok dari bahan (resep aktif)'
                : 'Mode: stok produk. Tambah bahan untuk mengaktifkan resep.'}
            </Text>
            <View style={styles.hppRow}>
              <Text style={styles.hppLabel}>Perkiraan biaya bahan / porsi</Text>
              <Text style={styles.hppNilai}>{formatRupiah(hpp)}</Text>
            </View>
          </View>

          <BottomSheetScrollView style={styles.flex} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {lines.length === 0 ? (
              <Text style={styles.kosong}>
                Belum ada bahan di resep ini. Tekan &quot;Tambah&quot; untuk memilih bahan
                dan jumlah pemakaian per porsi. Bila kosong, menu memakai stok produk biasa.
              </Text>
            ) : (
              lines.map((l) => {
                const sedangEdit = editId === l.resep_id;
                return (
                  <View key={l.resep_id} style={styles.row}>
                    <View style={styles.rowKiri}>
                      <Text style={styles.nama} numberOfLines={1}>{l.nama}</Text>
                      <Text style={styles.meta}>
                        Stok bahan: {fmtReal(l.stok)} {l.satuan}
                        {l.harga_beli > 0 ? `  ·  ${formatRupiah(l.qty * l.harga_beli)}/porsi` : ''}
                      </Text>
                    </View>

                    {sedangEdit ? (
                      <View style={styles.editWrap}>
                        <TextInput
                          style={styles.editInput}
                          value={editQtyStr}
                          onChangeText={(t) => setEditQtyStr(t.replace(/[^0-9.,]/g, ''))}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                        <Text style={styles.satuanTeks}>{l.satuan}</Text>
                        <Pressable onPress={() => { void simpanEdit(l); }} hitSlop={6} style={styles.okBtn}>
                          <Icon name="check" size={16} color={Colors.onPrimary} strokeWidth={2.8} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.qtyWrap}>
                        <Pressable
                          onPress={() => { setEditId(l.resep_id); setEditQtyStr(fmtReal(l.qty)); }}
                          style={styles.qtyPill}
                          hitSlop={4}
                        >
                          <Text style={styles.qtyTeks}>{fmtReal(l.qty)} {l.satuan}</Text>
                        </Pressable>
                        <Pressable onPress={() => { void hapus(l); }} hitSlop={8} style={styles.delBtn}>
                          <Icon name="trash" size={18} color={Colors.danger} strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: Spacing.xl }} />
          </BottomSheetScrollView>
        </View>
      ) : (
        <BottomSheetScrollView contentContainerStyle={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {tersedia.length === 0 ? (
            <Text style={styles.kosong}>
              Semua bahan sudah dipakai di resep ini, atau belum ada bahan terdaftar.
              Tambah bahan baru lewat tombol &quot;Bahan&quot; di layar Menu.
            </Text>
          ) : (
            <>
              <Text style={styles.label}>Pilih Bahan</Text>
              <View style={styles.bahanWrap}>
                {tersedia.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => { setBahanDipilihId(b.id); setErr(''); }}
                    style={[styles.bahanChip, bahanDipilihId === b.id && styles.bahanChipAktif]}
                  >
                    <Text style={[styles.bahanTeks, bahanDipilihId === b.id && styles.bahanTeksAktif]} numberOfLines={1}>
                      {b.nama} <Text style={styles.bahanSat}>({b.satuan})</Text>
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>
                Jumlah per Porsi
                {bahanDipilihId != null
                  ? ` (${tersedia.find((x) => x.id === bahanDipilihId)?.satuan ?? ''})`
                  : ''}
              </Text>
              <TextInput
                style={styles.inputBesar}
                value={qtyStr}
                onChangeText={(t) => { setQtyStr(t.replace(/[^0-9.,]/g, '')); setErr(''); }}
                placeholder="cth: 150"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>
                Jumlah bahan yang terpakai untuk membuat 1 porsi menu ini. Saat 1 menu terjual,
                stok bahan otomatis berkurang sebanyak ini.
              </Text>

              {!!err && <Text style={styles.error}>{err}</Text>}

              <View style={styles.formAksi}>
                <Pressable style={styles.batal} onPress={() => setMode('list')}>
                  <Text style={styles.batalTeks}>Batal</Text>
                </Pressable>
                <Pressable style={styles.simpanBtn} onPress={() => { void tambah(); }}>
                  <Text style={styles.simpanTeks}>Tambah ke Resep</Text>
                </Pressable>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  linkBold: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' },

  kepala: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
  menuNama: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  menuSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  hppRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.md, backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  hppLabel: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  hppNilai: { fontSize: FontSize.md, color: Colors.primaryDark, fontWeight: '800' },

  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowKiri: { flex: 1 },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },

  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyPill: { backgroundColor: Colors.surfaceAlt, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  qtyTeks: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primaryDark },
  delBtn: { padding: 2 },

  editWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  editInput: {
    width: 70, textAlign: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.primary,
    paddingVertical: Spacing.sm, fontSize: FontSize.md, fontWeight: '800', color: Colors.text,
  },
  satuanTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  okBtn: { width: 34, height: 34, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow(1) },

  formBody: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  bahanWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bahanChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, maxWidth: '100%' },
  bahanChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  bahanTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  bahanTeksAktif: { color: Colors.onPrimary },
  bahanSat: { fontWeight: '600' },

  inputBesar: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },

  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  batal: { height: 52, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md, paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  batalTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  simpanBtn: { flex: 1, height: 52, backgroundColor: Colors.primary, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  simpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
