/**
 * menu/tambah-produk.tsx — Halaman Tambah / Edit Produk.
 *
 * Menggantikan FormMenuItem BottomSheet. Pola identik preset-diskon.tsx:
 *   Stack native header, back arrow kiri, tidak ada drawer.
 *
 * Menerima params via expo-router:
 *   - id?       : number  → mode edit (item yang diedit)
 *   - (tanpa id): mode tambah baru
 *
 * Lapis 3 DIHAPUS:
 *   - trackMode state dihapus
 *   - pilihan mode "Produk" / "Resep" dihapus
 *   - Hint "Mode resep: ..." dihapus
 *   - Input stok selalu tampil (tidak ada kondisi modeRecipe)
 *   - MenuItemInput tidak lagi mengirim track_mode
 *
 * PERUBAHAN (FINISHING) — Audit B7 + B9:
 *   - ERROR PER-FIELD: state errors {nama?, harga?, umum?} → border merah +
 *     pesan inline di bawah field yang invalid (bukan satu teks di bawah).
 *   - SCROLL-TO-ERROR + AUTO-FOCUS: scrollRef.scrollTo top + focus() ke
 *     input pertama yang salah (nama/harga ada di card paling atas).
 *   - SAVING GUARD: cegah double-submit; tombol "Menyimpan…" + disabled.
 *   - Toast sukses setelah tambah/edit produk.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { formatAngka, parseRupiah } from '../../lib/utils/currency';
import { useToast } from '../../components/ui/toast';
import type { Kategori, MenuItem } from '../../lib/db/database';
import type { MenuItemInput } from '../../lib/db/menu';
import {
  getMenuById, getKategori,
  tambahMenuItem, updateMenuItem, hapusMenuItem,
} from '../../lib/db/menu';
import { features } from '../../lib/config/features';

function parseIntAman(teks: string): number {
  const digits = String(teks).replace(/[^0-9]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

/** Error per-field: pesan disimpan per kunci agar inline di bawah input. */
interface FormErrors {
  nama?: string;
  harga?: string;
  umum?: string;
}

export default function TambahProdukScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? parseInt(params.id, 10) : null;
  const isEdit = editId != null;
  const showInventory = features.inventory;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [kategori, setKategori] = useState<Kategori[]>([]);

  const [nama, setNama] = useState('');
  const [hargaStr, setHargaStr] = useState('');
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stokStr, setStokStr] = useState('0');
  const [minStokStr, setMinStokStr] = useState('5');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Refs untuk scroll-to-error + auto-focus field invalid.
  const scrollRef = useRef<ScrollView>(null);
  const namaRef = useRef<TextInput>(null);
  const hargaRef = useRef<TextInput>(null);

  const muat = useCallback(async () => {
    const [k, it] = await Promise.all([
      getKategori(),
      editId ? getMenuById(editId) : Promise.resolve(null),
    ]);
    setKategori(k);
    if (it) {
      setItem(it);
      setNama(it.nama);
      setHargaStr(formatAngka(it.harga));
      setKategoriId(it.kategori_id ?? null);
      setIsAvailable(it.is_available === 1);
      setStokStr(String(it.stok));
      setMinStokStr(String(it.min_stock));
    }
  }, [editId]);

  useEffect(() => { void muat(); }, [muat]);

  const simpan = useCallback(async () => {
    if (saving) return; // guard double-submit
    const harga = parseRupiah(hargaStr);

    // Validasi per-field + scroll ke atas (nama & harga di card teratas) + focus.
    if (!nama.trim()) {
      setErrors({ nama: 'Nama produk wajib diisi.' });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      namaRef.current?.focus();
      return;
    }
    if (harga <= 0) {
      setErrors({ harga: 'Harga harus lebih dari 0.' });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      hargaRef.current?.focus();
      return;
    }

    const input: MenuItemInput = {
      nama: nama.trim(),
      harga,
      kategori_id: kategoriId,
      is_available: isAvailable ? 1 : 0,
      stok: showInventory ? parseIntAman(stokStr) : (item?.stok ?? 0),
      min_stock: showInventory ? parseIntAman(minStokStr) : (item?.min_stock ?? 5),
    };

    setSaving(true);
    try {
      if (isEdit && editId) {
        await updateMenuItem(editId, input);
        toast.success(`"${input.nama}" diperbarui`);
      } else {
        await tambahMenuItem(input);
        toast.success(`"${input.nama}" ditambahkan ke menu`);
      }
      router.back();
    } catch {
      setErrors({ umum: 'Gagal menyimpan. Coba lagi.' });
    } finally {
      setSaving(false);
    }
  }, [saving, nama, hargaStr, kategoriId, isAvailable, stokStr, minStokStr,
      isEdit, editId, item, showInventory, router, toast]);

  const hapus = useCallback(() => {
    if (!editId || !item) return;
    Alert.alert(
      'Hapus menu?',
      `"${item.nama}" tidak akan muncul lagi di kasir.\n\nRiwayat transaksi tetap tercatat.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: () => {
            void (async () => {
              await hapusMenuItem(editId);
              router.back();
            })();
          },
        },
      ]
    );
  }, [editId, item, router]);

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit Produk' : 'Tambah Produk' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Nama & Harga ── */}
          <View style={styles.card}>
            <Text style={styles.label}>Nama Produk</Text>
            <TextInput
              ref={namaRef}
              style={[styles.input, !!errors.nama && styles.inputError]}
              value={nama}
              onChangeText={(t) => { setNama(t); setErrors({}); }}
              placeholder="cth: Kopi Tubruk"
              placeholderTextColor={Colors.textSubtle}
              autoFocus={!isEdit}
            />
            {!!errors.nama && <Text style={styles.errorInline}>{errors.nama}</Text>}

            <Text style={styles.label}>Harga</Text>
            <View style={[styles.hargaWrap, !!errors.harga && styles.inputError]}>
              <Text style={styles.rp}>Rp</Text>
              <TextInput
                ref={hargaRef}
                style={styles.inputHarga}
                value={hargaStr}
                onChangeText={(t) => { setHargaStr(formatAngka(parseRupiah(t))); setErrors({}); }}
                placeholder="0"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="number-pad"
              />
            </View>
            {!!errors.harga && <Text style={styles.errorInline}>{errors.harga}</Text>}
          </View>

          {/* ── Stok (V2 only) — product mode only, tidak ada pilihan recipe ── */}
          {showInventory && (
            <View style={styles.card}>
              <Text style={styles.label}>Stok</Text>
              <View style={styles.stokRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSub}>{isEdit ? 'Stok Saat Ini' : 'Stok Awal'}</Text>
                  <TextInput
                    style={styles.input}
                    value={stokStr}
                    onChangeText={(t) => { setStokStr(t.replace(/[^0-9]/g, '')); setErrors({}); }}
                    placeholder="0"
                    placeholderTextColor={Colors.textSubtle}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelSub}>Stok Minimum</Text>
                  <TextInput
                    style={styles.input}
                    value={minStokStr}
                    onChangeText={(t) => { setMinStokStr(t.replace(/[^0-9]/g, '')); setErrors({}); }}
                    placeholder="5"
                    placeholderTextColor={Colors.textSubtle}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                {isEdit
                  ? 'Mengubah stok di sini tercatat sebagai penyesuaian.'
                  : 'Notifikasi otomatis muncul saat stok ≤ stok minimum.'}
              </Text>
            </View>
          )}

          {/* ── Kategori ── */}
          <View style={styles.card}>
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
          </View>

          {/* ── Ketersediaan ── */}
          <Pressable style={styles.toggleRow} onPress={() => setIsAvailable(!isAvailable)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Tersedia dijual hari ini</Text>
              <Text style={styles.toggleSub}>
                Matikan jika stok habis. Bisa diaktifkan kembali kapan saja.
              </Text>
            </View>
            <View style={[styles.toggle, isAvailable && styles.toggleOn]}>
              <View style={[styles.knob, isAvailable && styles.knobOn]} />
            </View>
          </Pressable>

          {!!errors.umum && <Text style={styles.errorTeks}>{errors.umum}</Text>}

          {/* ── Tombol aksi ── */}
          <View style={styles.aksiRow}>
            {isEdit && (
              <Pressable style={styles.btnHapus} onPress={hapus} disabled={saving}>
                <Icon name="trash" size={18} color={Colors.danger} />
                <Text style={styles.btnHapusTeks}>Hapus</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.btnSimpan, saving && styles.btnOff]}
              onPress={() => { void simpan(); }}
              disabled={saving}
            >
              <Text style={styles.btnSimpanTeks}>
                {saving
                  ? 'Menyimpan…'
                  : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md, ...shadow(1),
  },
  label: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  labelSub: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  // Error state input: border merah + latar danger lembut.
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  errorInline: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  hargaWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  rp: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '700', marginRight: Spacing.sm },
  inputHarga: {
    flex: 1, paddingVertical: Spacing.md,
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.text,
  },
  stokRow: { flexDirection: 'row', gap: Spacing.md },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },
  katWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  katChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radii.full, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
  },
  katChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  katTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  katTeksAktif: { color: Colors.onPrimary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    gap: Spacing.md, ...shadow(1),
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  toggleSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.borderStrong, padding: 3 },
  toggleOn: { backgroundColor: Colors.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surface },
  knobOn: { alignSelf: 'flex-end' },
  errorTeks: {
    color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600',
    marginBottom: Spacing.md,
  },
  aksiRow: { flexDirection: 'row', gap: Spacing.md },
  btnHapus: {
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.dangerSoft,
    borderRadius: Radii.md, paddingHorizontal: Spacing.xl,
  },
  btnHapusTeks: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
  btnSimpan: {
    flex: 1, height: 52, backgroundColor: Colors.primary,
    borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', ...shadow(1),
  },
  btnOff: { opacity: 0.6 },
  btnSimpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
