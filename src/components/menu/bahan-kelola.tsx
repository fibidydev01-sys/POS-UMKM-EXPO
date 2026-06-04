/**
 * BahanKelola — sheet kelola BAHAN baku: daftar, tambah/edit, restock, opname.
 *
 * Dibuka dari tab Menu (tombol "Bahan" di header). Pola TUKAR-ISI dalam satu
 * <BottomSheet> (sama gaya dgn stok-opname.tsx & keranjang-panel.tsx):
 *   mode 'list' → daftar bahan + ringkasan nilai stok
 *   mode 'form' → tambah/edit bahan (nama, satuan, stok, min, harga beli)
 *   mode 'aksi' → restock / opname satu bahan
 *
 * PERBAIKAN SCROLL: daftar & form memakai BottomSheetScrollView (re-export
 * @expo/ui) agar bisa di-scroll di dalam sheet native. Lihat expo/expo#46379.
 *
 * Bahan BOLEH MINUS (sesuai kebutuhan): badge status & notif tetap muncul.
 * Setelah restock/opname → cek notif bahan + toast in-app.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '../ui/bottom-sheet';
import Icon from '../ui/icon';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah, formatAngka, parseRupiah } from '../../lib/utils/currency';
import type { Bahan } from '../../lib/db/database';
import type { BahanInput } from '../../lib/db/bahan';
import {
  getBahanList, tambahBahan, updateBahan, hapusBahan,
  incrementBahan, opnameBahan,
} from '../../lib/db/bahan';
import { checkAndNotifyLowStockBahan, notifyOpnameSelisihBahan } from '../../lib/notification/bahan-notif';
import { useToast } from '../ui/toast';

type Mode = 'list' | 'form' | 'aksi';
type Aksi = 'restock' | 'opname';

interface Props {
  visible: boolean;
  onTutup: () => void;
  /** Dipanggil setelah ada perubahan agar parent memuat ulang bila perlu. */
  onPerubahan?: () => void;
}

/** Satuan umum (saran). Tetap TEXT bebas — user boleh ketik manual. */
const SATUAN_SARAN = ['g', 'kg', 'ml', 'l', 'pcs', 'bungkus', 'butir', 'lembar'];

/** Parse angka REAL dari teks (izinkan koma/titik desimal). */
function parseReal(teks: string): number {
  const bersih = String(teks).replace(',', '.').replace(/[^0-9.]/g, '');
  if (!bersih) return 0;
  const n = parseFloat(bersih);
  return Number.isFinite(n) ? n : 0;
}

function fmtReal(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

function statusBahan(b: Bahan): { label: string; warna: string; bg: string } | null {
  if (b.stok <= 0) return { label: 'HABIS', warna: Colors.danger, bg: Colors.dangerSoft };
  if (b.stok <= b.min_stock) return { label: 'MENIPIS', warna: Colors.warning, bg: Colors.warningSoft };
  return null;
}

export default function BahanKelola({ visible, onTutup, onPerubahan }: Props) {
  const toast = useToast();
  const [items, setItems] = useState<Bahan[]>([]);
  const [mode, setMode] = useState<Mode>('list');

  // form tambah/edit
  const [edit, setEdit] = useState<Bahan | null>(null);
  const [nama, setNama] = useState('');
  const [satuan, setSatuan] = useState('pcs');
  const [stokStr, setStokStr] = useState('0');
  const [minStr, setMinStr] = useState('0');
  const [hargaStr, setHargaStr] = useState('');
  const [errForm, setErrForm] = useState('');

  // aksi restock/opname
  const [aksi, setAksi] = useState<Aksi>('restock');
  const [target, setTarget] = useState<Bahan | null>(null);
  const [nilaiStr, setNilaiStr] = useState('');
  const [errAksi, setErrAksi] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const list = await getBahanList();
    setItems(list);
  }, []);

  useEffect(() => {
    if (visible) {
      void muat();
      setMode('list');
    } else {
      setMode('list');
      setEdit(null);
      setTarget(null);
      setErrForm('');
      setErrAksi('');
    }
  }, [visible, muat]);

  const totalNilai = useMemo(() => items.reduce((s, b) => s + b.harga_beli * b.stok, 0), [items]);

  // ── Form tambah/edit ──
  const bukaTambah = () => {
    setEdit(null);
    setNama(''); setSatuan('pcs'); setStokStr('0'); setMinStr('0'); setHargaStr('');
    setErrForm('');
    setMode('form');
  };
  const bukaEdit = (b: Bahan) => {
    setEdit(b);
    setNama(b.nama); setSatuan(b.satuan);
    setStokStr(fmtReal(b.stok)); setMinStr(fmtReal(b.min_stock));
    setHargaStr(b.harga_beli ? formatAngka(b.harga_beli) : '');
    setErrForm('');
    setMode('form');
  };

  const simpanForm = async () => {
    const n = nama.trim();
    if (!n) { setErrForm('Nama bahan wajib diisi.'); return; }
    if (!satuan.trim()) { setErrForm('Satuan wajib diisi.'); return; }
    const input: BahanInput = {
      nama: n,
      satuan: satuan.trim(),
      stok: parseReal(stokStr),
      min_stock: parseReal(minStr),
      harga_beli: parseRupiah(hargaStr),
    };
    try {
      if (edit) {
        await updateBahan(edit.id, input);
        await checkAndNotifyLowStockBahan(edit.id);
        toast.success(`Bahan "${n}" diperbarui`);
      } else {
        const id = await tambahBahan(input);
        await checkAndNotifyLowStockBahan(id);
        toast.success(`Bahan "${n}" ditambahkan`);
      }
      await muat();
      onPerubahan?.();
      setMode('list');
    } catch {
      setErrForm('Gagal menyimpan bahan. Coba lagi.');
    }
  };

  const hapus = (b: Bahan) => {
    void (async () => {
      await hapusBahan(b.id);
      toast.info(`Bahan "${b.nama}" dihapus`);
      await muat();
      onPerubahan?.();
      setMode('list');
    })();
  };

  // ── Aksi restock/opname ──
  const bukaAksi = (b: Bahan, a: Aksi) => {
    setTarget(b);
    setAksi(a);
    setNilaiStr(a === 'opname' ? fmtReal(b.stok) : '');
    setErrAksi('');
    setMode('aksi');
  };

  const submitAksi = async () => {
    if (!target) return;
    const angka = parseReal(nilaiStr);
    if (aksi === 'restock') {
      if (!(angka > 0)) { setErrAksi('Jumlah restock minimal lebih dari 0.'); return; }
    } else {
      if (!(angka >= 0)) { setErrAksi('Stok fisik tidak valid.'); return; }
    }
    setSaving(true);
    try {
      if (aksi === 'restock') {
        await incrementBahan(target.id, angka, 'Restock manual');
        await checkAndNotifyLowStockBahan(target.id);
        toast.success(`${target.nama}: +${fmtReal(angka)} ${target.satuan} masuk`);
      } else {
        const { selisih } = await opnameBahan(target.id, angka, 'Opname manual');
        if (selisih !== 0) await notifyOpnameSelisihBahan(target.nama, target.satuan, selisih);
        await checkAndNotifyLowStockBahan(target.id);
        const ket = selisih === 0 ? 'sesuai catatan'
          : selisih > 0 ? `+${fmtReal(selisih)}` : `${fmtReal(selisih)}`;
        toast.success(`${target.nama}: stok jadi ${fmtReal(angka)} ${target.satuan} (${ket})`);
      }
      await muat();
      onPerubahan?.();
      setMode('list');
    } catch {
      setErrAksi('Gagal menyimpan perubahan stok. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const judul = mode === 'form'
    ? (edit ? 'Edit Bahan' : 'Tambah Bahan')
    : mode === 'aksi'
      ? (aksi === 'restock' ? 'Tambah Stok Bahan' : 'Opname Bahan')
      : 'Kelola Bahan';

  const headerRight =
    mode !== 'list' ? (
      <Pressable onPress={() => setMode('list')} hitSlop={8} style={styles.linkRow}>
        <Icon name="chevron-left" size={18} color={Colors.primary} />
        <Text style={styles.link}>Daftar</Text>
      </Pressable>
    ) : (
      <Pressable onPress={bukaTambah} hitSlop={8} style={styles.linkRow}>
        <Icon name="plus" size={16} color={Colors.primary} strokeWidth={2.8} />
        <Text style={styles.linkBold}>Tambah</Text>
      </Pressable>
    );

  return (
    <BottomSheet visible={visible} onClose={onTutup} title={judul} headerRight={headerRight} scrollable={false}>
      {mode === 'list' && (
        <View style={styles.flex}>
          <View style={styles.ringkasBar}>
            <Text style={styles.ringkasLabel}>Total Nilai Stok Bahan</Text>
            <Text style={styles.ringkasNilai}>{formatRupiah(totalNilai)}</Text>
          </View>

          <BottomSheetScrollView style={styles.flex} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <Text style={styles.kosong}>
                Belum ada bahan. Tekan &quot;Tambah&quot; untuk membuat bahan pertama
                (mis. Susu, Kopi, Gula).
              </Text>
            ) : (
              items.map((b) => {
                const st = statusBahan(b);
                return (
                  <View key={b.id} style={styles.row}>
                    <Pressable style={styles.rowKiri} onPress={() => bukaEdit(b)} hitSlop={4}>
                      <View style={styles.namaRow}>
                        <Text style={styles.nama} numberOfLines={1}>{b.nama}</Text>
                        {st && (
                          <View style={[styles.badge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.badgeTeks, { color: st.warna }]}>{st.label}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.meta}>
                        Stok: <Text style={styles.metaKuat}>{fmtReal(b.stok)} {b.satuan}</Text>
                        {'  ·  min '}{fmtReal(b.min_stock)}
                        {b.harga_beli > 0 ? `  ·  ${formatRupiah(b.harga_beli)}/${b.satuan}` : ''}
                      </Text>
                    </Pressable>
                    <View style={styles.aksiKanan}>
                      <Pressable onPress={() => bukaAksi(b, 'restock')} style={[styles.aksiBtn, styles.aksiRestock]} hitSlop={4}>
                        <Icon name="plus" size={16} color={Colors.onPrimary} strokeWidth={2.8} />
                        <Text style={styles.aksiRestockTeks}>Restock</Text>
                      </Pressable>
                      <Pressable onPress={() => bukaAksi(b, 'opname')} style={[styles.aksiBtn, styles.aksiOpname]} hitSlop={4}>
                        <Text style={styles.aksiOpnameTeks}>Opname</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: Spacing.xl }} />
          </BottomSheetScrollView>
        </View>
      )}

      {mode === 'form' && (
        <BottomSheetScrollView contentContainerStyle={styles.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nama Bahan</Text>
          <TextInput
            style={styles.input}
            value={nama}
            onChangeText={(t) => { setNama(t); setErrForm(''); }}
            placeholder="cth: Susu UHT, Kopi Bubuk, Gula"
            placeholderTextColor={Colors.textSubtle}
          />

          <Text style={styles.label}>Satuan</Text>
          <TextInput
            style={styles.input}
            value={satuan}
            onChangeText={(t) => { setSatuan(t); setErrForm(''); }}
            placeholder="g / ml / pcs / bungkus"
            placeholderTextColor={Colors.textSubtle}
            autoCapitalize="none"
          />
          <View style={styles.satuanWrap}>
            {SATUAN_SARAN.map((s) => (
              <Pressable key={s} onPress={() => setSatuan(s)} style={[styles.satuanChip, satuan === s && styles.satuanChipAktif]}>
                <Text style={[styles.satuanTeks, satuan === s && styles.satuanTeksAktif]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.duaKolom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{edit ? 'Stok Saat Ini' : 'Stok Awal'}</Text>
              <TextInput
                style={styles.input}
                value={stokStr}
                onChangeText={(t) => { setStokStr(t.replace(/[^0-9.,]/g, '')); setErrForm(''); }}
                placeholder="0"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stok Minimum</Text>
              <TextInput
                style={styles.input}
                value={minStr}
                onChangeText={(t) => { setMinStr(t.replace(/[^0-9.,]/g, '')); setErrForm(''); }}
                placeholder="0"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Harga Beli (per {satuan || 'satuan'})</Text>
          <View style={styles.hargaWrap}>
            <Text style={styles.rp}>Rp</Text>
            <TextInput
              style={styles.inputHarga}
              value={hargaStr}
              onChangeText={(t) => { setHargaStr(formatAngka(parseRupiah(t))); setErrForm(''); }}
              placeholder="0"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.hint}>
            Untuk menghitung nilai stok. Catatan: 1 bahan = 1 satuan tetap. Bila beli per kg
            tapi resep pakai gram, simpan bahan dalam gram (mis. 1 kg → stok 1000 g).
          </Text>

          {!!errForm && <Text style={styles.error}>{errForm}</Text>}

          <View style={styles.formAksi}>
            {edit && (
              <Pressable style={styles.hapusBtn} onPress={() => hapus(edit)}>
                <Text style={styles.hapusTeks}>Hapus</Text>
              </Pressable>
            )}
            <Pressable style={styles.simpanBtn} onPress={() => { void simpanForm(); }}>
              <Text style={styles.simpanTeks}>{edit ? 'Simpan Perubahan' : 'Tambah Bahan'}</Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      )}

      {mode === 'aksi' && (
        <View style={styles.formBody}>
          <Text style={styles.formProduk}>{target?.nama}</Text>
          <Text style={styles.formSub}>
            Stok sistem saat ini: <Text style={styles.metaKuat}>{target ? fmtReal(target.stok) : 0} {target?.satuan}</Text>
          </Text>

          <Text style={styles.label}>
            {aksi === 'restock' ? `Jumlah Masuk (${target?.satuan})` : `Hasil Hitung Fisik (${target?.satuan})`}
          </Text>
          <TextInput
            style={styles.inputBesar}
            value={nilaiStr}
            onChangeText={(t) => { setNilaiStr(t.replace(/[^0-9.,]/g, '')); setErrAksi(''); }}
            placeholder="0"
            placeholderTextColor={Colors.textSubtle}
            keyboardType="decimal-pad"
            autoFocus
          />

          {aksi === 'restock' && target && nilaiStr !== '' && (
            <Text style={styles.preview}>
              Stok setelah restock: {fmtReal(target.stok + parseReal(nilaiStr))} {target.satuan}
            </Text>
          )}
          {aksi === 'opname' && target && nilaiStr !== '' && (
            <Text style={styles.preview}>
              Selisih: {parseReal(nilaiStr) - target.stok > 0 ? '+' : ''}
              {fmtReal(parseReal(nilaiStr) - target.stok)} {target.satuan} dari catatan
            </Text>
          )}

          {!!errAksi && <Text style={styles.error}>{errAksi}</Text>}

          <View style={styles.formAksi}>
            <Pressable style={styles.batal} onPress={() => setMode('list')}>
              <Text style={styles.batalTeks}>Batal</Text>
            </Pressable>
            <Pressable style={[styles.simpanBtn, saving && { opacity: 0.6 }]} onPress={() => { void submitAksi(); }} disabled={saving}>
              <Text style={styles.simpanTeks}>
                {saving ? 'Menyimpan…' : aksi === 'restock' ? 'Tambah Stok' : 'Simpan Opname'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  linkBold: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' },

  ringkasBar: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    backgroundColor: Colors.primarySoft, borderRadius: Radii.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  ringkasLabel: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  ringkasNilai: { fontSize: FontSize.lg, color: Colors.primaryDark, fontWeight: '800' },

  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowKiri: { flex: 1 },
  namaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  badge: { borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeTeks: { fontSize: FontSize.xs, fontWeight: '800' },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },
  metaKuat: { color: Colors.text, fontWeight: '800' },
  aksiKanan: { gap: Spacing.sm, alignItems: 'flex-end' },
  aksiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, height: 34, borderRadius: Radii.md, justifyContent: 'center', minWidth: 92 },
  aksiRestock: { backgroundColor: Colors.primary, ...shadow(1) },
  aksiRestockTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.xs },
  aksiOpname: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  aksiOpnameTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.xs },

  formBody: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  formProduk: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  formSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  duaKolom: { flexDirection: 'row', gap: Spacing.md },
  hargaWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg,
  },
  rp: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '700', marginRight: Spacing.sm },
  inputHarga: { flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },

  satuanWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  satuanChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  satuanChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  satuanTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  satuanTeksAktif: { color: Colors.onPrimary },

  inputBesar: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  preview: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700', marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },

  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  batal: { height: 52, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md, paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  batalTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  hapusBtn: { height: 52, backgroundColor: Colors.dangerSoft, borderRadius: Radii.md, paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  hapusTeks: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
  simpanBtn: { flex: 1, height: 52, backgroundColor: Colors.primary, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  simpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
