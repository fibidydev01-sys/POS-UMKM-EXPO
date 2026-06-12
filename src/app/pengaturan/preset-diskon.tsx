/**
 * pengaturan/preset-diskon.tsx — Halaman Kelola Preset Diskon.
 *
 * PERUBAHAN (SPLIT):
 *   - Mode list dipindah ke components/pengaturan/preset-list.tsx.
 *   - Mode form dipindah ke components/pengaturan/form-preset.tsx.
 *   Screen ini hanya mengelola: state, handlers, Stack.Screen config,
 *   dan switch antara dua mode.
 *
 * NAVIGASI KEMBALI — ATURAN TUNGGAL:
 *   Mode LIST  → back arrow Stack default (keluar halaman).
 *   Mode FORM  → back arrow override ke kembaliKeDaftar() via headerLeft.
 *   Tidak ada headerRight di mode apapun.
 *
 * PERUBAHAN (FINISHING) — Audit B9:
 *   - errorField ('nama' | 'persen' | null): validasi kini menandai FIELD
 *     yang salah → FormPreset menampilkan border merah + pesan inline tepat
 *     di bawah field tersebut.
 *   - saving guard: cegah double-submit; tombol "Menyimpan…" selama proses.
 *   - Mengetik di field apa pun menghapus error (onChange handler).
 */
import { useState, useCallback } from 'react';
import { StyleSheet, Pressable, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import PresetList from '../../components/pengaturan/preset-list';
import FormPreset, { type PresetErrorField } from '../../components/pengaturan/form-preset';
import {
  getDiskonPreset,
  tambahDiskonPreset,
  updateDiskonPreset,
  hapusDiskonPreset,
} from '../../lib/db/diskon-preset';
import type { DiskonPreset } from '../../lib/db/database';

type Mode = 'list' | 'form';

export default function PresetDiskonScreen() {
  const insets = useSafeAreaInsets();
  const FAB_CLEARANCE = 60 + insets.bottom + Spacing.xl;

  const [mode, setMode] = useState<Mode>('list');
  const [presets, setPresets] = useState<DiskonPreset[]>([]);
  const [editPreset, setEditPreset] = useState<DiskonPreset | null>(null);
  const [nama, setNama] = useState('');
  const [persen, setPersen] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<PresetErrorField>(null);
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const p = await getDiskonPreset();
    setPresets(p);
  }, []);

  useFocusEffect(
    useCallback(() => { void muat(); }, [muat])
  );

  const resetError = useCallback(() => {
    setError('');
    setErrorField(null);
  }, []);

  const bukaFormBaru = useCallback(() => {
    setEditPreset(null);
    setNama('');
    setPersen('');
    resetError();
    setMode('form');
  }, [resetError]);

  const bukaFormEdit = useCallback((p: DiskonPreset) => {
    setEditPreset(p);
    setNama(p.nama);
    setPersen(String(p.persen));
    resetError();
    setMode('form');
  }, [resetError]);

  const kembaliKeDaftar = useCallback(() => {
    setMode('list');
    setEditPreset(null);
    setNama('');
    setPersen('');
    resetError();
  }, [resetError]);

  const simpan = useCallback(async () => {
    if (saving) return; // guard double-submit
    const namaTrim = nama.trim();
    const persenInt = parseInt(persen, 10);
    if (!namaTrim) {
      setError('Nama preset wajib diisi.');
      setErrorField('nama');
      return;
    }
    if (isNaN(persenInt) || persenInt <= 0 || persenInt > 100) {
      setError('Persen harus antara 1–100.');
      setErrorField('persen');
      return;
    }
    setSaving(true);
    try {
      if (editPreset) {
        await updateDiskonPreset(editPreset.id, namaTrim, persenInt);
      } else {
        await tambahDiskonPreset(namaTrim, persenInt);
      }
      await muat();
      kembaliKeDaftar();
    } catch {
      setError('Gagal menyimpan. Coba lagi.');
      setErrorField(null); // error umum, tampil di bawah card
    } finally {
      setSaving(false);
    }
  }, [saving, nama, persen, editPreset, muat, kembaliKeDaftar]);

  const hapus = useCallback((preset: DiskonPreset) => {
    Alert.alert(
      'Hapus preset?',
      `"${preset.nama}" akan dihapus permanen.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await hapusDiskonPreset(preset.id);
              await muat();
              kembaliKeDaftar();
            })();
          },
        },
      ]
    );
  }, [muat, kembaliKeDaftar]);

  const screenTitle = mode === 'list' ? 'Preset Diskon' : editPreset ? 'Edit Preset' : 'Tambah Preset';

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerRight: undefined,
          headerLeft: mode === 'form'
            ? () => (
                <Pressable onPress={kembaliKeDaftar} hitSlop={12} style={styles.backBtn}>
                  <Icon name="chevron-left" size={26} color={Colors.primary} strokeWidth={2.4} />
                </Pressable>
              )
            : undefined,
        }}
      />

      {mode === 'list' ? (
        <PresetList
          presets={presets}
          fabClearance={FAB_CLEARANCE}
          insets={insets}
          onEdit={bukaFormEdit}
          onTambah={bukaFormBaru}
        />
      ) : (
        <FormPreset
          editPreset={editPreset}
          nama={nama}
          persen={persen}
          error={error}
          errorField={errorField}
          saving={saving}
          onChangeNama={(t) => { setNama(t); resetError(); }}
          onChangePersen={(t) => { setPersen(t.replace(/[^0-9]/g, '')); resetError(); }}
          onSimpan={() => { void simpan(); }}
          onHapus={hapus}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
