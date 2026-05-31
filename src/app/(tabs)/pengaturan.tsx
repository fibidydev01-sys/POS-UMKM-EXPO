/**
 * Pengaturan — profil usaha, lebar kertas, backup, program promo, preset diskon.
 *
 * DITULIS ULANG untuk @expo/ui (sheet native):
 *   Preset diskon (daftar) + form tambah/edit jadi SATU sheet dengan TUKAR-ISI
 *   (state `presetFormMode`). Bukan dua sheet bertumpuk.
 *     presetFormMode=false → daftar preset (headerRight "+ Tambah")
 *     presetFormMode=true  → form preset (headerRight "‹ Daftar")
 *
 * PERUBAHAN v2:
 *   - formHapus & formSimpan → height: 52 untuk konsistensi dengan drawer lain.
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { UmkmConfig, DiskonPreset } from '../../lib/db/database';
import { getConfig, updateProfil } from '../../lib/db/pengaturan';
import {
  getDiskonPreset, tambahDiskonPreset, updateDiskonPreset, hapusDiskonPreset,
} from '../../lib/db/diskon-preset';
import { exportExcel, importExcel } from '../../lib/export/excel';
import { features } from '../../lib/config/features';
import BottomSheet from '../../components/ui/bottom-sheet';

export default function PengaturanScreen() {
  const router = useRouter();

  const [config, setConfig] = useState<UmkmConfig | null>(null);
  const [presets, setPresets] = useState<DiskonPreset[]>([]);

  const [namaUsaha, setNamaUsaha] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [footer, setFooter] = useState('');
  const [lebar, setLebar] = useState<58 | 80>(58);
  const [profilTersimpan, setProfilTersimpan] = useState(false);

  const [backupLoading, setBackupLoading] = useState<'export' | 'import' | null>(null);

  // Sheet preset (daftar ↔ form, tukar-isi)
  const [presetVisible, setPresetVisible] = useState(false);
  const [presetFormMode, setPresetFormMode] = useState(false);
  const [editPreset, setEditPreset] = useState<DiskonPreset | null>(null);
  const [presetNama, setPresetNama] = useState('');
  const [presetPersen, setPresetPersen] = useState('');
  const [presetError, setPresetError] = useState('');

  const muat = useCallback(async () => {
    const [c, p] = await Promise.all([getConfig(), getDiskonPreset()]);
    setConfig(c);
    setPresets(p);
    if (c) {
      setNamaUsaha(c.nama_usaha ?? '');
      setAlamat(c.alamat ?? '');
      setTelepon(c.telepon ?? '');
      setFooter(c.footer_struk ?? '');
      setLebar((c.lebar_kertas === 80 ? 80 : 58) as 58 | 80);
    }
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const simpanProfil = async () => {
    if (!namaUsaha.trim()) { Alert.alert('Nama usaha wajib', 'Isi nama usaha terlebih dahulu.'); return; }
    await updateProfil({
      nama_usaha: namaUsaha.trim(),
      alamat: alamat.trim(),
      telepon: telepon.trim(),
      footer_struk: footer.trim(),
      lebar_kertas: lebar,
    });
    setProfilTersimpan(true);
    setTimeout(() => setProfilTersimpan(false), 2000);
    await muat();
  };

  const gantiLebar = async (val: 58 | 80) => {
    setLebar(val);
    await updateProfil({ lebar_kertas: val });
  };

  const handleExport = async () => {
    setBackupLoading('export');
    try {
      const res = await exportExcel();
      Alert.alert(res.ok ? 'Berhasil' : 'Gagal', res.pesan ?? (res.ok ? 'Data diekspor.' : 'Tidak bisa ekspor.'));
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mengekspor data.');
    } finally {
      setBackupLoading(null);
    }
  };

  const handleImport = async () => {
    setBackupLoading('import');
    try {
      const res = await importExcel();
      if (res.ok) {
        Alert.alert('Berhasil', res.pesan ?? `${res.jumlah ?? 0} baris diimpor.`);
        await muat();
      } else {
        Alert.alert('Gagal', res.pesan ?? 'Tidak bisa impor.');
      }
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mengimpor data.');
    } finally {
      setBackupLoading(null);
    }
  };

  // ── Preset diskon ──
  const bukaDaftarPreset = () => {
    setPresetFormMode(false);
    setEditPreset(null);
    setPresetVisible(true);
  };

  const tutupPreset = () => {
    setPresetVisible(false);
    setPresetFormMode(false);
    setEditPreset(null);
    setPresetNama('');
    setPresetPersen('');
    setPresetError('');
  };

  const bukaFormPreset = (preset?: DiskonPreset) => {
    setEditPreset(preset ?? null);
    setPresetNama(preset?.nama ?? '');
    setPresetPersen(preset ? String(preset.persen) : '');
    setPresetError('');
    setPresetFormMode(true);
  };

  const simpanPreset = async () => {
    const nama = presetNama.trim();
    const persen = parseInt(presetPersen, 10);
    if (!nama) return setPresetError('Nama preset wajib diisi.');
    if (isNaN(persen) || persen <= 0 || persen > 100) return setPresetError('Persen harus 1–100.');
    try {
      if (editPreset) await updateDiskonPreset(editPreset.id, nama, persen);
      else await tambahDiskonPreset(nama, persen);
      setPresetFormMode(false);
      setEditPreset(null);
      setPresetNama('');
      setPresetPersen('');
      setPresetError('');
      await muat();
    } catch {
      setPresetError('Gagal menyimpan. Coba lagi.');
    }
  };

  const hapusPreset = (preset: DiskonPreset) => {
    Alert.alert('Hapus preset?', `"${preset.nama}" akan dihapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await hapusDiskonPreset(preset.id);
          setPresetFormMode(false);
          await muat();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.sub}>Profil usaha, struk, dan data</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Profil */}
          <Text style={styles.sectionLabel}>Profil Usaha</Text>
          <View style={styles.card}>
            <Field label="Nama Usaha" value={namaUsaha} onChange={setNamaUsaha} placeholder="cth: Warung Kopi Senja" />
            <Field label="Alamat" value={alamat} onChange={setAlamat} placeholder="Alamat singkat" multiline />
            <Field label="Telepon" value={telepon} onChange={setTelepon} placeholder="08xx" keyboardType="phone-pad" />
            <Field label="Catatan kaki struk" value={footer} onChange={setFooter} placeholder="cth: Terima kasih 🙏" multiline />
            <Pressable style={styles.btnPrimary} onPress={simpanProfil}>
              <Text style={styles.btnPrimaryTxt}>{profilTersimpan ? '✓ Tersimpan' : 'Simpan Profil'}</Text>
            </Pressable>
          </View>

          {/* Lebar kertas */}
          <Text style={styles.sectionLabel}>Lebar Kertas Struk</Text>
          <View style={styles.card}>
            <View style={styles.lebarRow}>
              {([58, 80] as const).map((w) => (
                <Pressable
                  key={w}
                  onPress={() => gantiLebar(w)}
                  style={[styles.lebarBtn, lebar === w && styles.lebarBtnAktif]}
                >
                  <Text style={[styles.lebarTxt, lebar === w && styles.lebarTxtAktif]}>{w} mm</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Preset diskon */}
          <Text style={styles.sectionLabel}>Preset Diskon</Text>
          <Pressable style={styles.navRow} onPress={bukaDaftarPreset}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Kelola Preset Diskon</Text>
              <Text style={styles.navSub}>{presets.length} preset tersimpan</Text>
            </View>
            <Text style={styles.navChevron}>›</Text>
          </Pressable>

          {/* Program promo */}
          {features.promoEngine && (
            <>
              <Text style={styles.sectionLabel}>Program Promo</Text>
              <Pressable style={styles.navRow} onPress={() => router.push('/promo')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Atur Program Promo</Text>
                  <Text style={styles.navSub}>BOGO & diskon item otomatis</Text>
                </View>
                <Text style={styles.navChevron}>›</Text>
              </Pressable>
            </>
          )}

          {/* Backup */}
          <Text style={styles.sectionLabel}>Data & Backup</Text>
          <View style={styles.card}>
            <Pressable style={styles.btnOutline} onPress={handleExport} disabled={backupLoading !== null}>
              {backupLoading === 'export'
                ? <ActivityIndicator color={Colors.primary} />
                : <Text style={styles.btnOutlineTxt}>⬇  Export ke Excel</Text>}
            </Pressable>
            <Pressable style={[styles.btnOutline, { marginTop: Spacing.sm }]} onPress={handleImport} disabled={backupLoading !== null}>
              {backupLoading === 'import'
                ? <ActivityIndicator color={Colors.primary} />
                : <Text style={styles.btnOutlineTxt}>⬆  Import dari Excel</Text>}
            </Pressable>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sheet preset (daftar ↔ form, tukar-isi) */}
      <BottomSheet
        visible={presetVisible}
        onClose={tutupPreset}
        title={presetFormMode ? (editPreset ? 'Edit Preset' : 'Tambah Preset') : 'Preset Diskon'}
        snapPoints={['half', 'full']}
        headerRight={
          presetFormMode ? (
            <Pressable onPress={() => setPresetFormMode(false)} hitSlop={8}>
              <Text style={styles.kembaliLink}>‹ Daftar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => bukaFormPreset()} hitSlop={8}>
              <Text style={styles.tambahLink}>+ Tambah</Text>
            </Pressable>
          )
        }
      >
        {presetFormMode ? (
          /* ── form preset ── */
          <View style={styles.presetForm}>
            <Text style={styles.formLabel}>Nama Preset</Text>
            <TextInput
              style={styles.formInput}
              value={presetNama}
              onChangeText={(t) => { setPresetNama(t); setPresetError(''); }}
              placeholder="cth: Member, Promo Akhir Pekan"
              placeholderTextColor={Colors.textSubtle}
              autoFocus
            />
            <Text style={styles.formLabel}>Persen Diskon</Text>
            <View style={styles.persenWrap}>
              <TextInput
                style={styles.persenInput}
                value={presetPersen}
                onChangeText={(t) => { setPresetPersen(t.replace(/[^0-9]/g, '')); setPresetError(''); }}
                placeholder="0"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.persenSuffix}>%</Text>
            </View>
            {!!presetError && <Text style={styles.error}>{presetError}</Text>}
            <View style={styles.formAksi}>
              {editPreset && (
                <Pressable style={styles.formHapus} onPress={() => hapusPreset(editPreset)}>
                  <Text style={styles.formHapusTxt}>Hapus</Text>
                </Pressable>
              )}
              <Pressable style={styles.formSimpan} onPress={simpanPreset}>
                <Text style={styles.formSimpanTxt}>{editPreset ? 'Simpan' : 'Tambah'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── daftar preset ── */
          <ScrollView
            style={styles.presetListScroll}
            contentContainerStyle={styles.presetListContent}
            showsVerticalScrollIndicator={false}
          >
            {presets.length === 0 ? (
              <Text style={styles.presetKosong}>
                Belum ada preset. Tekan "+ Tambah" untuk membuat preset diskon pertama.
              </Text>
            ) : (
              presets.map((p) => (
                <Pressable key={p.id} style={styles.presetRow} onPress={() => bukaFormPreset(p)}>
                  <Text style={styles.presetNama}>{p.nama}</Text>
                  <View style={styles.presetBadge}>
                    <Text style={styles.presetBadgeTxt}>{p.persen}%</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'phone-pad' | 'default';
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSubtle}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },

  sectionLabel: {
    fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  fieldInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  fieldMultiline: { minHeight: 56, textAlignVertical: 'top' },

  btnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, ...shadow(1),
  },
  btnPrimaryTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },

  lebarRow: { flexDirection: 'row', gap: Spacing.md },
  lebarBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  lebarBtnAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  lebarTxt: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textMuted },
  lebarTxtAktif: { color: Colors.primaryDark },

  navRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  navSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  navChevron: { fontSize: 24, color: Colors.textMuted, fontWeight: '700' },

  btnOutline: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, minHeight: 48,
  },
  btnOutlineTxt: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },

  kembaliLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  tambahLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' },

  presetListScroll: { flex: 1 },
  presetListContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  presetKosong: {
    color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center',
    paddingVertical: Spacing.xl, lineHeight: 20,
  },
  presetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  presetNama: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600', flex: 1 },
  presetBadge: {
    backgroundColor: Colors.primarySoft, borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  presetBadgeTxt: { color: Colors.primaryDark, fontWeight: '800', fontSize: FontSize.sm },

  presetForm: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  formLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  formInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  persenWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  persenInput: { flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  persenSuffix: { fontSize: FontSize.lg, color: Colors.textMuted, fontWeight: '700' },
  error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.md, fontWeight: '600' },
  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },

  // Hapus — height: 52
  formHapus: {
    height: 52,
    backgroundColor: Colors.dangerSoft, borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  formHapusTxt: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },

  // Simpan — height: 52
  formSimpan: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },
  formSimpanTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});