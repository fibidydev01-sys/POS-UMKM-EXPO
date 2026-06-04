/**
 * Pengaturan — profil usaha, lebar kertas, backup, program promo, preset diskon.
 *
 * @expo/ui (sheet native): Preset diskon (daftar) + form tambah/edit jadi SATU
 * sheet dengan TUKAR-ISI (state `presetFormMode`). Bukan dua sheet bertumpuk.
 *     presetFormMode=false → daftar preset (headerRight "Tambah")
 *     presetFormMode=true  → form preset (headerRight "Daftar")
 *
 * PERBAIKAN SCROLL: daftar preset DI DALAM sheet memakai BottomSheetScrollView
 * (re-export @expo/ui) agar bisa di-scroll di sheet native. ScrollView halaman
 * (di luar sheet) TETAP ScrollView biasa. Lihat expo/expo#46379.
 *
 * PERUBAHAN v3:
 *   - Pakai ScreenLayout (header konsisten).
 *   - Daftar preset diskon memakai PickerRow → seragam dengan kategori & picker.
 *   - SEMUA emoji/teks-ikon (chevron, panah export/import, plus) diganti ikon lucide.
 *   - Field config tetap KANONIK: nama_umkm / alamat / no_telp / footer_struk /
 *     paper_width (sesuai database.ts & type UmkmConfig).
 *
 * PERUBAHAN (QRIS local-first):
 *   - Section "Pembayaran" → baris nav ke /pembayaran (setup PG). Gated features.qris.
 *   - Section "Keamanan" → toggle kunci aplikasi biometrik/PIN (Phase 4).
 *
 * PERUBAHAN (notifikasi stok):
 *   - Section "Notifikasi Stok" (komponen NotifSettingsSection) disisipkan antara
 *     Program Promo dan Data & Backup. Komponen mandiri: master toggle, jadwal
 *     pagi/sore/mingguan + pemilih hari, simpan ke SQLite & reschedule otomatis.
 *
 * PERBAIKAN TYPECHECK:
 *   - router.push('/pembayaran') di-cast ke Href. Route ini valid (file
 *     app/pembayaran.tsx ada & terdaftar di _layout), tetapi typed-routes
 *     expo-router hanya meng-generate union saat `expo start`/prebuild — pada
 *     `tsc --noEmit` murni (CI / clone bersih) union bisa BASI sehingga
 *     '/pembayaran' belum terdaftar. Cast `as Href` membuatnya lolos sekarang
 *     DAN tetap benar setelah typegen memasukkan route tsb. Hanya call ini
 *     yang dicast; '/promo' & '/(tabs)/pengaturan' dibiarkan apa adanya.
 */

import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import type { UmkmConfig, DiskonPreset } from '../../lib/db/database';
import { getConfig, updateProfil } from '../../lib/db/pengaturan';
import {
  getDiskonPreset, tambahDiskonPreset, updateDiskonPreset, hapusDiskonPreset,
} from '../../lib/db/diskon-preset';
import { exportExcel, importExcel } from '../../lib/export/excel';
import { features } from '../../lib/config/features';
import { lockAktif, setLockAktif, cekBiometrik } from '../../lib/secure/app-lock';
import ScreenLayout from '../../components/ui/screen-layout';
import BottomSheet, { BottomSheetScrollView } from '../../components/ui/bottom-sheet';
import type { IconName } from '../../components/ui/icon';
import Icon from '../../components/ui/icon';
import PickerRow from '../../components/ui/picker-row';
import NotifSettingsSection from '../../components/pengaturan/notif-settings';

export default function PengaturanScreen() {
  const router = useRouter();

  const [, setConfig] = useState<UmkmConfig | null>(null);
  const [presets, setPresets] = useState<DiskonPreset[]>([]);

  const [namaUsaha, setNamaUsaha] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [footer, setFooter] = useState('');
  const [lebar, setLebar] = useState<58 | 80>(58);
  const [profilTersimpan, setProfilTersimpan] = useState(false);

  const [backupLoading, setBackupLoading] = useState<'export' | 'import' | null>(null);

  // Kunci aplikasi (Phase 4).
  const [kunci, setKunci] = useState(false);

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
      setNamaUsaha(c.nama_umkm ?? '');
      setAlamat(c.alamat ?? '');
      setTelepon(c.no_telp ?? '');
      setFooter(c.footer_struk ?? '');
      setLebar((c.paper_width === 80 ? 80 : 58) as 58 | 80);
    }
    setKunci(await lockAktif());
  }, []);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const simpanProfil = async () => {
    if (!namaUsaha.trim()) { Alert.alert('Nama usaha wajib', 'Isi nama usaha terlebih dahulu.'); return; }
    await updateProfil({
      nama_umkm: namaUsaha.trim(),
      alamat: alamat.trim(),
      no_telp: telepon.trim(),
      footer_struk: footer.trim(),
      paper_width: lebar,
    });
    setProfilTersimpan(true);
    setTimeout(() => setProfilTersimpan(false), 2000);
    await muat();
  };

  const gantiLebar = async (val: 58 | 80) => {
    setLebar(val);
    await updateProfil({ paper_width: val });
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

  // ── Kunci aplikasi (Phase 4) ──
  const toggleKunci = async (next: boolean) => {
    if (next) {
      const cap = await cekBiometrik();
      if (!cap.bisa) {
        Alert.alert(
          'Biometrik belum tersedia',
          'Aktifkan sidik jari / Face ID atau PIN di pengaturan HP terlebih dahulu.'
        );
        return;
      }
    }
    await setLockAktif(next);
    setKunci(next);
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
        onPress: () => {
          void (async () => {
            await hapusDiskonPreset(preset.id);
            setPresetFormMode(false);
            await muat();
          })();
        },
      },
    ]);
  };

  return (
    <ScreenLayout title="Pengaturan" subtitle="Profil usaha, struk, dan data" bodyPadding={0}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Profil */}
          <Text style={styles.sectionLabel}>Profil Usaha</Text>
          <View style={styles.card}>
            <Field label="Nama Usaha" icon="store" value={namaUsaha} onChange={setNamaUsaha} placeholder="cth: Warung Kopi Senja" />
            <Field label="Alamat" icon="map-pin" value={alamat} onChange={setAlamat} placeholder="Alamat singkat" multiline />
            <Field label="Telepon" icon="phone" value={telepon} onChange={setTelepon} placeholder="08xx" keyboardType="phone-pad" />
            <Field label="Catatan kaki struk" icon="file" value={footer} onChange={setFooter} placeholder="cth: Terima kasih atas kunjungan Anda" multiline />
            <Pressable style={styles.btnPrimary} onPress={() => { void simpanProfil(); }}>
              {profilTersimpan ? (
                <View style={styles.btnPrimaryRow}>
                  <Icon name="check" size={18} color={Colors.onPrimary} strokeWidth={3} />
                  <Text style={styles.btnPrimaryTxt}>Tersimpan</Text>
                </View>
              ) : (
                <Text style={styles.btnPrimaryTxt}>Simpan Profil</Text>
              )}
            </Pressable>
          </View>

          {/* Lebar kertas */}
          <Text style={styles.sectionLabel}>Lebar Kertas Struk</Text>
          <View style={styles.card}>
            <View style={styles.lebarRow}>
              {([58, 80] as const).map((w) => (
                <Pressable
                  key={w}
                  onPress={() => { void gantiLebar(w); }}
                  style={[styles.lebarBtn, lebar === w && styles.lebarBtnAktif]}
                >
                  <Text style={[styles.lebarTxt, lebar === w && styles.lebarTxtAktif]}>{w} mm</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Pembayaran QRIS — hanya tampil bila tier mengizinkan */}
          {features.qris && (
            <>
              <Text style={styles.sectionLabel}>Pembayaran</Text>
              <Pressable style={styles.navRow} onPress={() => router.push('/pembayaran' as Href)}>
                <Icon name="smartphone" size={22} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Pembayaran QRIS</Text>
                  <Text style={styles.navSub}>Hubungkan Xendit / Midtrans / DOKU</Text>
                </View>
                <Icon name="chevron-right" size={22} color={Colors.textMuted} />
              </Pressable>
            </>
          )}

          {/* Preset diskon */}
          <Text style={styles.sectionLabel}>Preset Diskon</Text>
          <Pressable style={styles.navRow} onPress={bukaDaftarPreset}>
            <Icon name="badge-percent" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Kelola Preset Diskon</Text>
              <Text style={styles.navSub}>{presets.length} preset tersimpan</Text>
            </View>
            <Icon name="chevron-right" size={22} color={Colors.textMuted} />
          </Pressable>

          {/* Program promo */}
          {features.promoManagement && (
            <>
              <Text style={styles.sectionLabel}>Program Promo</Text>
              <Pressable style={styles.navRow} onPress={() => router.push('/promo')}>
                <Icon name="gift" size={22} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Atur Program Promo</Text>
                  <Text style={styles.navSub}>BOGO & diskon item otomatis</Text>
                </View>
                <Icon name="chevron-right" size={22} color={Colors.textMuted} />
              </Pressable>
            </>
          )}

          {/* Notifikasi stok — komponen mandiri (master toggle + jadwal reminder) */}
          <View style={styles.notifWrap}>
            <NotifSettingsSection />
          </View>

          {/* Backup */}
          <Text style={styles.sectionLabel}>Data & Backup</Text>
          <View style={styles.card}>
            <Pressable style={styles.btnOutline} onPress={() => { void handleExport(); }} disabled={backupLoading !== null}>
              {backupLoading === 'export'
                ? <ActivityIndicator color={Colors.primary} />
                : (
                  <>
                    <Icon name="download" size={18} color={Colors.primary} />
                    <Text style={styles.btnOutlineTxt}>Export ke Excel</Text>
                  </>
                )}
            </Pressable>
            <Pressable style={[styles.btnOutline, { marginTop: Spacing.sm }]} onPress={() => { void handleImport(); }} disabled={backupLoading !== null}>
              {backupLoading === 'import'
                ? <ActivityIndicator color={Colors.primary} />
                : (
                  <>
                    <Icon name="upload" size={18} color={Colors.primary} />
                    <Text style={styles.btnOutlineTxt}>Import dari Excel</Text>
                  </>
                )}
            </Pressable>
          </View>

          {/* Keamanan — kunci aplikasi (Phase 4) */}
          <Text style={styles.sectionLabel}>Keamanan</Text>
          <View style={styles.navRow}>
            <Icon name="key" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Kunci Aplikasi</Text>
              <Text style={styles.navSub}>Minta biometrik/PIN saat membuka aplikasi</Text>
            </View>
            <Switch
              value={kunci}
              onValueChange={(v) => { void toggleKunci(v); }}
              trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sheet preset (daftar ↔ form, tukar-isi) */}
      <BottomSheet
        visible={presetVisible}
        onClose={tutupPreset}
        scrollable={false}
        title={presetFormMode ? (editPreset ? 'Edit Preset' : 'Tambah Preset') : 'Preset Diskon'}
        headerRight={
          presetFormMode ? (
            <Pressable onPress={() => setPresetFormMode(false)} hitSlop={8} style={styles.linkRow}>
              <Icon name="chevron-left" size={18} color={Colors.primary} />
              <Text style={styles.kembaliLink}>Daftar</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => bukaFormPreset()} hitSlop={8} style={styles.linkRow}>
              <Icon name="plus" size={16} color={Colors.primary} strokeWidth={2.8} />
              <Text style={styles.tambahLink}>Tambah</Text>
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
              <Pressable style={styles.formSimpan} onPress={() => { void simpanPreset(); }}>
                <Text style={styles.formSimpanTxt}>{editPreset ? 'Simpan' : 'Tambah'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── daftar preset (PickerRow seragam) ── */
          <BottomSheetScrollView
            style={styles.presetListScroll}
            contentContainerStyle={styles.presetListContent}
            showsVerticalScrollIndicator={false}
          >
            {presets.length === 0 ? (
              <Text style={styles.presetKosong}>
                Belum ada preset. Tekan &quot;Tambah&quot; untuk membuat preset diskon pertama.
              </Text>
            ) : (
              presets.map((p) => (
                <PickerRow
                  key={p.id}
                  label={p.nama}
                  badge={`${p.persen}%`}
                  onPress={() => bukaFormPreset(p)}
                />
              ))
            )}
          </BottomSheetScrollView>
        )}
      </BottomSheet>
    </ScreenLayout>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, keyboardType, icon,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'phone-pad' | 'default';
  icon?: IconName;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <View style={styles.fieldLabelRow}>
        {!!icon && <Icon name={icon} size={15} color={Colors.textMuted} />}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
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
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
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
  btnPrimaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  navTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  navSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Pembungkus section notifikasi (komponen mandiri punya kartu sendiri).
  notifWrap: { marginTop: Spacing.lg },

  btnOutline: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    flexDirection: 'row', gap: Spacing.sm,
    paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, minHeight: 48,
  },
  btnOutlineTxt: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kembaliLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  tambahLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '800' },

  presetListScroll: { flex: 1 },
  presetListContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: Spacing.lg },
  presetKosong: {
    color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center',
    paddingVertical: Spacing.xl, lineHeight: 20,
  },

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

  formHapus: {
    height: 52,
    backgroundColor: Colors.dangerSoft, borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  formHapusTxt: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },

  formSimpan: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },
  formSimpanTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
