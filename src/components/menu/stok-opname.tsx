/**
 * StokOpname — sheet kelola stok: restock (barang masuk) & opname (hitung fisik).
 *
 * Dibuka dari tab Menu (tombol "Kelola Stok"). Menampilkan daftar produk dengan
 * stok saat ini, badge status (habis/menipis), dan dua aksi per produk:
 *   - Restock  : tambah qty masuk (incrementStock → stock_log 'in').
 *   - Opname   : set stok ke hasil hitung fisik (opnameStock → stock_log 'opname').
 *
 * Memakai <BottomSheet> (wrapper @expo/ui) dengan pola TUKAR-ISI:
 *   mode 'list'   → daftar produk
 *   mode 'form'   → form aksi (restock / opname) untuk satu produk
 *
 * PERBAIKAN SCROLL: daftar produk memakai BottomSheetScrollView (re-export
 * @expo/ui) agar bisa di-scroll di dalam sheet native. Lihat expo/expo#46379.
 *
 * Notifikasi:
 *   - Setelah restock/opname, cek stok → bila masih ≤ min, kirim notif OS.
 *   - Toast in-app untuk konfirmasi aksi sukses.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '../ui/bottom-sheet';
import Icon from '../ui/icon';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import type { MenuItem } from '../../lib/db/database';
import { incrementStock, opnameStock } from '../../lib/db/stock';
import { checkAndNotifyLowStock, notifyOpnameSelisih } from '../../lib/notification/stock-notif';
import { useToast } from '../ui/toast';

type Mode = 'list' | 'form';
type Aksi = 'restock' | 'opname';

interface Props {
  visible: boolean;
  items: MenuItem[];
  onTutup: () => void;
  /** Dipanggil setelah ada perubahan stok agar parent memuat ulang data. */
  onPerubahan: () => void;
}

function statusStok(it: MenuItem): { label: string; warna: string; bg: string } | null {
  if (it.stok <= 0) return { label: 'HABIS', warna: Colors.danger, bg: Colors.dangerSoft };
  if (it.stok <= it.min_stock) return { label: 'MENIPIS', warna: Colors.warning, bg: Colors.warningSoft };
  return null;
}

export default function StokOpname({ visible, items, onTutup, onPerubahan }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('list');
  const [aksi, setAksi] = useState<Aksi>('restock');
  const [target, setTarget] = useState<MenuItem | null>(null);
  const [nilaiStr, setNilaiStr] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMode('list');
      setTarget(null);
      setNilaiStr('');
      setError('');
    }
  }, [visible]);

  const totalNilai = useMemo(
    () => items.reduce((s, it) => s + it.harga * it.stok, 0),
    [items]
  );

  const bukaForm = (item: MenuItem, a: Aksi) => {
    setTarget(item);
    setAksi(a);
    setNilaiStr(a === 'opname' ? String(item.stok) : '');
    setError('');
    setMode('form');
  };

  const kembaliKeList = () => {
    setMode('list');
    setTarget(null);
    setNilaiStr('');
    setError('');
  };

  const submit = useCallback(async () => {
    if (!target) return;
    const angka = parseInt(nilaiStr.replace(/[^0-9]/g, ''), 10);
    if (aksi === 'restock') {
      if (!Number.isFinite(angka) || angka <= 0) { setError('Jumlah restock minimal 1.'); return; }
    } else {
      if (!Number.isFinite(angka) || angka < 0) { setError('Stok fisik tidak valid.'); return; }
    }

    setSaving(true);
    try {
      if (aksi === 'restock') {
        await incrementStock(target.id, angka, 'Restock manual');
        await checkAndNotifyLowStock(target.id);
        toast.success(`${target.nama}: +${angka} stok masuk`);
      } else {
        const { selisih } = await opnameStock(target.id, angka, 'Opname manual');
        if (selisih !== 0) await notifyOpnameSelisih(target.nama, selisih);
        await checkAndNotifyLowStock(target.id);
        const ket = selisih === 0
          ? 'sesuai catatan'
          : selisih > 0 ? `+${selisih} dari catatan` : `${selisih} dari catatan`;
        toast.success(`${target.nama}: stok jadi ${angka} (${ket})`);
      }
      onPerubahan();
      kembaliKeList();
    } catch {
      setError('Gagal menyimpan perubahan stok. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [aksi, nilaiStr, target, toast, onPerubahan]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onTutup}
      title={mode === 'form' ? (aksi === 'restock' ? 'Tambah Stok' : 'Opname Stok') : 'Kelola Stok'}
      scrollable={false}
      headerRight={
        mode === 'form' ? (
          <Pressable onPress={kembaliKeList} hitSlop={8} style={styles.linkRow}>
            <Icon name="chevron-left" size={18} color={Colors.primary} />
            <Text style={styles.link}>Daftar</Text>
          </Pressable>
        ) : undefined
      }
    >
      {mode === 'list' ? (
        <View style={styles.flex}>
          <View style={styles.ringkasBar}>
            <Text style={styles.ringkasLabel}>Total Nilai Stok</Text>
            <Text style={styles.ringkasNilai}>{formatRupiah(totalNilai)}</Text>
          </View>

          <BottomSheetScrollView
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <Text style={styles.kosong}>Belum ada produk. Tambahkan produk dulu di tab Menu.</Text>
            ) : (
              items.map((it) => {
                const st = statusStok(it);
                return (
                  <View key={it.id} style={styles.row}>
                    <View style={styles.rowKiri}>
                      <View style={styles.namaRow}>
                        <Text style={styles.nama} numberOfLines={1}>{it.nama}</Text>
                        {st && (
                          <View style={[styles.badge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.badgeTeks, { color: st.warna }]}>{st.label}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.meta}>
                        Stok: <Text style={styles.metaKuat}>{it.stok}</Text>
                        {'  ·  min '}{it.min_stock}
                        {'  ·  '}{formatRupiah(it.harga * it.stok)}
                      </Text>
                    </View>
                    <View style={styles.aksiKanan}>
                      <Pressable
                        onPress={() => bukaForm(it, 'restock')}
                        style={[styles.aksiBtn, styles.aksiRestock]}
                        hitSlop={4}
                      >
                        <Icon name="plus" size={16} color={Colors.onPrimary} strokeWidth={2.8} />
                        <Text style={styles.aksiRestockTeks}>Restock</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => bukaForm(it, 'opname')}
                        style={[styles.aksiBtn, styles.aksiOpname]}
                        hitSlop={4}
                      >
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
      ) : (
        <View style={styles.formBody}>
          <Text style={styles.formProduk}>{target?.nama}</Text>
          <Text style={styles.formSub}>
            Stok sistem saat ini: <Text style={styles.metaKuat}>{target?.stok}</Text>
          </Text>

          <Text style={styles.label}>
            {aksi === 'restock' ? 'Jumlah Barang Masuk' : 'Hasil Hitung Fisik (stok sebenarnya)'}
          </Text>
          <TextInput
            style={styles.inputBesar}
            value={nilaiStr}
            onChangeText={(t) => { setNilaiStr(t.replace(/[^0-9]/g, '')); setError(''); }}
            placeholder="0"
            placeholderTextColor={Colors.textSubtle}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {aksi === 'restock' && target && nilaiStr !== '' && (
            <Text style={styles.preview}>
              Stok setelah restock: {target.stok + (parseInt(nilaiStr, 10) || 0)}
            </Text>
          )}
          {aksi === 'opname' && target && nilaiStr !== '' && (
            <Text style={styles.preview}>
              Selisih: {(parseInt(nilaiStr, 10) || 0) - target.stok > 0 ? '+' : ''}
              {(parseInt(nilaiStr, 10) || 0) - target.stok} dari catatan sistem
            </Text>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.formAksi}>
            <Pressable style={styles.batal} onPress={kembaliKeList}>
              <Text style={styles.batalTeks}>Batal</Text>
            </Pressable>
            <Pressable
              style={[styles.simpan, saving && { opacity: 0.6 }]}
              onPress={() => { void submit(); }}
              disabled={saving}
            >
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

  ringkasBar: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    backgroundColor: Colors.primarySoft, borderRadius: Radii.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  ringkasLabel: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  ringkasNilai: { fontSize: FontSize.lg, color: Colors.primaryDark, fontWeight: '800' },

  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowKiri: { flex: 1 },
  namaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  badge: { borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeTeks: { fontSize: FontSize.xs, fontWeight: '800' },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },
  metaKuat: { color: Colors.text, fontWeight: '800' },
  aksiKanan: { gap: Spacing.sm, alignItems: 'flex-end' },
  aksiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, height: 34, borderRadius: Radii.md,
    justifyContent: 'center', minWidth: 92,
  },
  aksiRestock: { backgroundColor: Colors.primary, ...shadow(1) },
  aksiRestockTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.xs },
  aksiOpname: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  aksiOpnameTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.xs },

  formBody: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  formProduk: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  formSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  inputBesar: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  preview: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700', marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },
  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  batal: {
    height: 52, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center',
  },
  batalTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  simpan: {
    flex: 1, height: 52, backgroundColor: Colors.primary, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center', ...shadow(1),
  },
  simpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
