/**
 * menu/kategori.tsx — Halaman Kelola Kategori.
 *
 * Menggantikan sheet kategori inline di menu.tsx.
 * Pola identik sub-pages pengaturan: Stack native header, back arrow kiri.
 *
 * PERUBAHAN (FINISHING):
 *   - Input auto-focus saat halaman buka (Audit B7) — kasir langsung bisa
 *     mengetik tanpa tap input dulu.
 *   - Validasi nama duplikat (case-insensitive) — inline error + border merah,
 *     bukan diam-diam menambah kategori kembar (bug baru #6 yang ditemukan).
 *   - toast.success setelah kategori berhasil ditambah (Audit B10:
 *     simpan berhasil → toast, bukan tanpa feedback).
 *   - Error otomatis hilang saat user mengetik ulang.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { useToast } from '../../components/ui/toast';
import { getKategori, tambahKategori, hapusKategori } from '../../lib/db/menu';
import type { Kategori } from '../../lib/db/database';

export default function KategoriScreen() {
  const toast = useToast();
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [namaBaru, setNamaBaru] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const k = await getKategori();
    setKategori(k);
  }, []);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const simpan = useCallback(async () => {
    const nama = namaBaru.trim();
    if (!nama) return;

    // Cek duplikat case-insensitive terhadap daftar kategori yang ada.
    const duplikat = kategori.some(
      (k) => k.nama.trim().toLowerCase() === nama.toLowerCase()
    );
    if (duplikat) {
      setError(`Kategori "${nama}" sudah ada.`);
      return;
    }

    if (saving) return; // guard double-submit
    setSaving(true);
    try {
      await tambahKategori(nama);
      setNamaBaru('');
      setError('');
      await muat();
      toast.success(`Kategori "${nama}" ditambahkan`);
    } catch {
      setError('Gagal menyimpan kategori. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [namaBaru, kategori, saving, muat, toast]);

  const konfirmasiHapus = useCallback((k: Kategori) => {
    Alert.alert(
      'Hapus kategori?',
      `"${k.nama}" dihapus. Menu di dalamnya tetap ada tanpa kategori.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: () => { void (async () => { await hapusKategori(k.id); await muat(); })(); },
        },
      ]
    );
  }, [muat]);

  return (
    <>
      <Stack.Screen options={{ title: 'Kelola Kategori' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Input tambah kategori baru — auto-focus + inline error */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, !!error && styles.inputError]}
            placeholder="Nama kategori baru"
            placeholderTextColor={Colors.textSubtle}
            value={namaBaru}
            onChangeText={(t) => { setNamaBaru(t); setError(''); }}
            onSubmitEditing={() => { void simpan(); }}
            returnKeyType="done"
            autoFocus
          />
          <Pressable
            style={[styles.tambahBtn, saving && styles.btnOff]}
            onPress={() => { void simpan(); }}
            disabled={saving}
          >
            <Text style={styles.tambahTeks}>
              {saving ? 'Menyimpan…' : 'Tambah'}
            </Text>
          </Pressable>
        </View>

        {/* Inline error: duplikat / gagal simpan */}
        {!!error && <Text style={styles.errorTeks}>{error}</Text>}

        {/* Daftar kategori */}
        {kategori.length === 0 ? (
          <View style={styles.kosongWrap}>
            <Text style={styles.kosong}>Belum ada kategori.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {kategori.map((k, i) => (
              <View key={k.id}>
                <View style={styles.katRow}>
                  <Text style={styles.katNama} numberOfLines={1}>{k.nama}</Text>
                  <Pressable
                    onPress={() => konfirmasiHapus(k)}
                    hitSlop={8}
                    style={styles.hapusBtn}
                  >
                    <Icon name="trash" size={18} color={Colors.danger} strokeWidth={2.2} />
                  </Pressable>
                </View>
                {i < kategori.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Visual error state pada input (Audit B9): border merah + latar dangerSoft.
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  tambahBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    ...shadow(1),
  },
  btnOff: { opacity: 0.6 },
  tambahTeks: { color: Colors.onPrimary, fontWeight: '700', fontSize: FontSize.md },
  errorTeks: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  kosongWrap: { paddingVertical: Spacing.xl, alignItems: 'center' },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...shadow(1),
  },
  katRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  katNama: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  hapusBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
});
