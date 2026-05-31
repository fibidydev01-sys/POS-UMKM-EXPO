/**
 * FormMenuItem — form tambah / edit produk menu.
 *
 * Memakai <BottomSheet> (wrapper @expo/ui). Header & handle dari sheet native.
 * Logika bisnis form TIDAK BERUBAH.
 *
 * PERUBAHAN v2:
 *   - Tombol Hapus & Simpan → height: 52 untuk konsistensi dengan drawer lain.
 *   - Tombol silang dihapus (ditangani BottomSheet: showClose default false).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import BottomSheet from '../ui/bottom-sheet';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatAngka, parseRupiah } from '../../lib/utils/currency';
import { Kategori, MenuItem } from '../../lib/db/database';
import { MenuItemInput } from '../../lib/db/menu';

interface Props {
  visible: boolean;
  kategori: Kategori[];
  item?: MenuItem | null;
  onTutup: () => void;
  onSimpan: (input: MenuItemInput) => void;
  onHapus?: () => void;
}

export default function FormMenuItem({ visible, kategori, item, onTutup, onSimpan, onHapus }: Props) {
  const [nama, setNama] = useState('');
  const [hargaStr, setHargaStr] = useState('');
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNama(item?.nama ?? '');
      setHargaStr(item ? formatAngka(item.harga) : '');
      setKategoriId(item?.kategori_id ?? null);
      setIsAvailable(item ? item.is_available === 1 : true);
      setError('');
    }
  }, [visible, item]);

  const simpan = () => {
    const harga = parseRupiah(hargaStr);
    if (!nama.trim()) return setError('Nama produk wajib diisi.');
    if (harga <= 0) return setError('Harga harus lebih dari 0.');
    onSimpan({
      nama: nama.trim(),
      harga,
      kategori_id: kategoriId,
      is_available: isAvailable ? 1 : 0,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onTutup}
      title={item ? 'Edit Produk' : 'Tambah Produk'}
      scrollable
      snapPoints={[{ fraction: 0.85 }]}
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

  // Tombol — height: 52 (konsisten dengan semua tombol aksi drawer)
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
