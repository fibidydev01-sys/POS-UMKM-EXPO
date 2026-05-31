/**
 * FormPromoRule — form tambah aturan promo (BOGO / diskon item).
 *
 * DITULIS ULANG: dari AppModal custom → <BottomSheet> (wrapper @expo/ui),
 * scrollable, snapPoints full. Tidak ada handle/KeyboardAvoidingView manual.
 * Validasi tanggal & pemilihan produk TIDAK berubah.
 *
 * PERUBAHAN v2:
 *   - Tombol Batal & Simpan → height: 52 untuk konsistensi dengan drawer lain.
 *   - Tombol silang dihapus (ditangani BottomSheet: showClose default false).
 *
 * ── KONTRAK ──
 *   Props.onSimpan menerima objek PromoRuleInput.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import BottomSheet from '../ui/bottom-sheet';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { MenuItem } from '../../lib/db/database';

export type PromoTipe = 'bogo' | 'diskon_item';

export interface PromoRuleInput {
  nama: string;
  tipe: PromoTipe;
  menu_item_id: number;
  nilai: number;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
}

interface Props {
  visible: boolean;
  menuItems: MenuItem[];
  onTutup: () => void;
  onSimpan: (input: PromoRuleInput) => void;
}

const RX_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default function FormPromoRule({ visible, menuItems, onTutup, onSimpan }: Props) {
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState<PromoTipe>('bogo');
  const [menuItemId, setMenuItemId] = useState<number | null>(null);
  const [nilai, setNilai] = useState('1');
  const [mulai, setMulai] = useState('');
  const [selesai, setSelesai] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNama('');
      setTipe('bogo');
      setMenuItemId(null);
      setNilai('1');
      setMulai('');
      setSelesai('');
      setError('');
    }
  }, [visible]);

  const bangunInput = (): PromoRuleInput | null => {
    if (!nama.trim()) { setError('Nama promo wajib diisi.'); return null; }
    if (menuItemId == null) { setError('Pilih produk target promo.'); return null; }
    const angka = parseInt(nilai, 10);
    if (isNaN(angka) || angka <= 0) { setError(tipe === 'bogo' ? 'Qty gratis minimal 1.' : 'Persen diskon minimal 1.'); return null; }
    if (tipe === 'diskon_item' && angka > 100) { setError('Persen diskon maksimal 100.'); return null; }
    if (mulai && !RX_TANGGAL.test(mulai)) { setError('Tanggal mulai harus format YYYY-MM-DD.'); return null; }
    if (selesai && !RX_TANGGAL.test(selesai)) { setError('Tanggal selesai harus format YYYY-MM-DD.'); return null; }
    if (mulai && selesai && selesai < mulai) { setError('Tanggal selesai tidak boleh sebelum mulai.'); return null; }
    return {
      nama: nama.trim(),
      tipe,
      menu_item_id: menuItemId,
      nilai: angka,
      tanggal_mulai: mulai || null,
      tanggal_selesai: selesai || null,
    };
  };

  const simpan = () => {
    const input = bangunInput();
    if (input) onSimpan(input);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onTutup}
      title="Tambah Promo"
      scrollable
      snapPoints={['full']}
    >
      <View style={styles.body}>
        <Text style={styles.label}>Nama Promo</Text>
        <TextInput
          style={styles.input}
          value={nama}
          onChangeText={(t) => { setNama(t); setError(''); }}
          placeholder="cth: Beli 2 Gratis 1 Kopi"
          placeholderTextColor={Colors.textSubtle}
        />

        <Text style={styles.label}>Tipe Promo</Text>
        <View style={styles.tipeRow}>
          <TipeCard
            aktif={tipe === 'bogo'}
            judul="BOGO"
            ket="Beli sekian, dapat gratis"
            onPress={() => { setTipe('bogo'); setNilai('1'); setError(''); }}
          />
          <TipeCard
            aktif={tipe === 'diskon_item'}
            judul="Diskon Item"
            ket="Potongan % untuk produk"
            onPress={() => { setTipe('diskon_item'); setNilai('10'); setError(''); }}
          />
        </View>

        <Text style={styles.label}>Produk Target</Text>
        <View style={styles.produkWrap}>
          {menuItems.length === 0 ? (
            <Text style={styles.produkKosong}>Belum ada produk. Tambahkan di tab Menu.</Text>
          ) : (
            menuItems.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => { setMenuItemId(m.id); setError(''); }}
                style={[styles.produkChip, menuItemId === m.id && styles.produkChipAktif]}
              >
                <Text style={[styles.produkTxt, menuItemId === m.id && styles.produkTxtAktif]} numberOfLines={1}>
                  {m.nama}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.label}>{tipe === 'bogo' ? 'Jumlah Gratis (qty)' : 'Persen Diskon (%)'}</Text>
        <TextInput
          style={styles.input}
          value={nilai}
          onChangeText={(t) => { setNilai(t.replace(/[^0-9]/g, '')); setError(''); }}
          keyboardType="number-pad"
          maxLength={3}
          placeholder={tipe === 'bogo' ? '1' : '10'}
          placeholderTextColor={Colors.textSubtle}
        />

        <Text style={styles.label}>Periode (opsional)</Text>
        <View style={styles.tanggalRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tanggalKet}>Mulai</Text>
            <TextInput
              style={styles.input}
              value={mulai}
              onChangeText={(t) => { setMulai(t); setError(''); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSubtle}
              autoCapitalize="none"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tanggalKet}>Selesai</Text>
            <TextInput
              style={styles.input}
              value={selesai}
              onChangeText={(t) => { setSelesai(t); setError(''); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSubtle}
              autoCapitalize="none"
            />
          </View>
        </View>
        <Text style={styles.hint}>Kosongkan periode = promo selalu aktif.</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.aksi}>
          {/* Batal — height: 52 */}
          <Pressable style={styles.batal} onPress={onTutup}>
            <Text style={styles.batalTxt}>Batal</Text>
          </Pressable>
          {/* Simpan — height: 52 */}
          <Pressable style={styles.simpan} onPress={simpan}>
            <Text style={styles.simpanTxt}>Simpan Promo</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

function TipeCard({ aktif, judul, ket, onPress }: { aktif: boolean; judul: string; ket: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tipeCard, aktif && styles.tipeCardAktif]}>
      <Text style={[styles.tipeJudul, aktif && styles.tipeJudulAktif]}>{judul}</Text>
      <Text style={[styles.tipeKet, aktif && styles.tipeKetAktif]}>{ket}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  tipeRow: { flexDirection: 'row', gap: Spacing.md },
  tipeCard: {
    flex: 1, padding: Spacing.md, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  tipeCardAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  tipeJudul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textMuted },
  tipeJudulAktif: { color: Colors.primaryDark },
  tipeKet: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  tipeKetAktif: { color: Colors.primary },
  produkWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  produkKosong: { color: Colors.textMuted, fontSize: FontSize.sm },
  produkChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, maxWidth: '100%',
  },
  produkChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  produkTxt: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  produkTxtAktif: { color: Colors.onPrimary },
  tanggalRow: { flexDirection: 'row', gap: Spacing.md },
  tanggalKet: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },
  aksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },

  // Batal — height: 52
  batal: {
    height: 52,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  batalTxt: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },

  // Simpan — height: 52
  simpan: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },
  simpanTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
