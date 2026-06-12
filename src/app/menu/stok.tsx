/**
 * menu/stok.tsx — Halaman Kelola Stok (Restock & Opname). V2 only.
 *
 * Menggantikan StokOpname BottomSheet. Mode list/form identik preset-diskon.tsx.
 * Back arrow kiri native: mode list → keluar, mode form → kembali ke list.
 *
 * Lapis 3 DIHAPUS:
 *   - Filter .filter((x) => x.track_mode !== 'recipe') dihapus
 *   - Semua produk langsung masuk list (semua product mode)
 *
 * PERUBAHAN (FINISHING):
 *   - Konfirmasi selisih besar pada Opname (Audit B7): bila selisih lebih dari
 *     50% stok sistem DAN selisih absolut >= 10, tampilkan Alert konfirmasi
 *     "Periksa Lagi" / "Ya, Simpan" sebelum menulis ke DB. Mencegah salah ketik
 *     (mis. stok 100 → opname 1) merusak catatan stok.
 *   - submit() dipecah: validasi → konfirmasi (bila perlu) → lakukanSimpan().
 *   - Copy empty state diperbaiki: "Belum ada produk dengan stok produk." →
 *     "Belum ada produk untuk dikelola stoknya."
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import { getMenuItems } from '../../lib/db/menu';
import { incrementStock, opnameStock } from '../../lib/db/stock';
import { checkAndNotifyLowStock, notifyOpnameSelisih } from '../../lib/notification/stock-notif';
import { useToast } from '../../components/ui/toast';
import type { MenuItem } from '../../lib/db/database';

type Mode = 'list' | 'form';
type Aksi = 'restock' | 'opname';

function statusStok(it: MenuItem): { label: string; warna: string; bg: string } | null {
  if (it.stok <= 0) return { label: 'HABIS', warna: Colors.danger, bg: Colors.dangerSoft };
  if (it.stok <= it.min_stock) return { label: 'MENIPIS', warna: Colors.warning, bg: Colors.warningSoft };
  return null;
}

export default function StokScreen() {
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [aksi, setAksi] = useState<Aksi>('restock');
  const [target, setTarget] = useState<MenuItem | null>(null);
  const [nilaiStr, setNilaiStr] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const m = await getMenuItems();
    // Semua produk masuk list — tidak ada filter track_mode lagi
    setItems(m);
  }, []);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const totalNilai = items.reduce((s, it) => s + it.harga * it.stok, 0);

  const bukaForm = useCallback((item: MenuItem, a: Aksi) => {
    setTarget(item);
    setAksi(a);
    setNilaiStr(a === 'opname' ? String(item.stok) : '');
    setError('');
    setMode('form');
  }, []);

  const kembaliKeList = useCallback(() => {
    setMode('list');
    setTarget(null);
    setNilaiStr('');
    setError('');
  }, []);

  /**
   * Eksekusi simpan SETELAH lolos validasi & konfirmasi.
   * Dipecah dari submit() agar bisa dipanggil dari tombol "Ya, Simpan"
   * pada Alert konfirmasi selisih besar.
   */
  const lakukanSimpan = useCallback(async (angka: number) => {
    if (!target) return;
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
        const ket = selisih === 0 ? 'sesuai catatan'
          : selisih > 0 ? `+${selisih} dari catatan` : `${selisih} dari catatan`;
        toast.success(`${target.nama}: stok jadi ${angka} (${ket})`);
      }
      await muat();
      kembaliKeList();
    } catch {
      setError('Gagal menyimpan perubahan stok. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [aksi, target, toast, muat, kembaliKeList]);

  const submit = useCallback(async () => {
    if (!target || saving) return;
    const angka = parseInt(nilaiStr.replace(/[^0-9]/g, ''), 10);
    if (aksi === 'restock') {
      if (!Number.isFinite(angka) || angka <= 0) { setError('Jumlah restock minimal 1.'); return; }
    } else {
      if (!Number.isFinite(angka) || angka < 0) { setError('Stok fisik tidak valid.'); return; }
    }

    // ── Konfirmasi selisih besar (opname saja) ──────────────────────────
    // Bila selisih > 50% stok sistem DAN selisih absolut >= 10, kemungkinan
    // salah ketik. Tahan dulu dengan dialog konfirmasi sebelum menulis.
    if (aksi === 'opname' && target.stok > 0) {
      const selisih = angka - target.stok;
      const ambang = target.stok * 0.5;
      if (Math.abs(selisih) > ambang && Math.abs(selisih) >= 10) {
        Alert.alert(
          'Selisih stok besar',
          `Stok sistem: ${target.stok}\nHasil hitung fisik: ${angka}\nSelisih: ${selisih > 0 ? '+' : ''}${selisih}\n\nYakin angka ini benar?`,
          [
            { text: 'Periksa Lagi', style: 'cancel' },
            { text: 'Ya, Simpan', style: 'destructive', onPress: () => { void lakukanSimpan(angka); } },
          ]
        );
        return;
      }
    }

    await lakukanSimpan(angka);
  }, [aksi, nilaiStr, target, saving, lakukanSimpan]);

  const screenTitle = mode === 'list' ? 'Kelola Stok'
    : aksi === 'restock' ? 'Tambah Stok' : 'Opname Stok';

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLeft: mode === 'form'
            ? () => (
                <Pressable onPress={kembaliKeList} hitSlop={12} style={styles.backBtn}>
                  <Icon name="chevron-left" size={26} color={Colors.primary} strokeWidth={2.4} />
                </Pressable>
              )
            : undefined,
        }}
      />

      {mode === 'list' ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Ringkasan nilai stok */}
          <View style={styles.ringkasBar}>
            <Text style={styles.ringkasLabel}>Total Nilai Stok</Text>
            <Text style={styles.ringkasNilai}>{formatRupiah(totalNilai)}</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.kosongWrap}>
              <Text style={styles.kosong}>Belum ada produk untuk dikelola stoknya.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {items.map((it, i) => {
                const st = statusStok(it);
                return (
                  <View key={it.id}>
                    <View style={styles.row}>
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
                        >
                          <Icon name="plus" size={16} color={Colors.onPrimary} strokeWidth={2.8} />
                          <Text style={styles.aksiRestockTeks}>Restock</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => bukaForm(it, 'opname')}
                          style={[styles.aksiBtn, styles.aksiOpname]}
                        >
                          <Text style={styles.aksiOpnameTeks}>Opname</Text>
                        </Pressable>
                      </View>
                    </View>
                    {i < items.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.formProduk}>{target?.nama}</Text>
              <Text style={styles.formSub}>
                Stok sistem saat ini: <Text style={styles.metaKuat}>{target?.stok}</Text>
              </Text>

              <Text style={styles.formLabel}>
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

              {!!error && <Text style={styles.errorTeks}>{error}</Text>}
            </View>

            <Pressable
              style={[styles.btnSimpan, saving && { opacity: 0.6 }]}
              onPress={() => { void submit(); }}
              disabled={saving}
            >
              <Text style={styles.btnSimpanTeks}>
                {saving ? 'Menyimpan…' : aksi === 'restock' ? 'Tambah Stok' : 'Simpan Opname'}
              </Text>
            </Pressable>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backBtn: { paddingRight: Spacing.sm, paddingVertical: Spacing.xs },
  scroll: { padding: Spacing.lg },
  ringkasBar: {
    backgroundColor: Colors.primarySoft, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md, ...shadow(1),
  },
  ringkasLabel: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  ringkasNilai: { fontSize: FontSize.lg, color: Colors.primaryDark, fontWeight: '800' },
  kosongWrap: { paddingVertical: Spacing.xl, alignItems: 'center' },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm },
  listCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...shadow(1),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
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
  formCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md, ...shadow(1),
  },
  formProduk: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  formSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  formLabel: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  inputBesar: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  preview: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700', marginTop: Spacing.sm },
  errorTeks: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },
  btnSimpan: {
    height: 52, backgroundColor: Colors.primary, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center', ...shadow(1),
  },
  btnSimpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
