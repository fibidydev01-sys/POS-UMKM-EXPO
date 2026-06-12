/**
 * pengaturan/backup.tsx — Halaman Backup & Restore Data.
 *
 * PERUBAHAN (SPLIT):
 *   - Tiga card (Export, Import, Info) dipindah ke
 *     components/pengaturan/backup-content.tsx.
 *   Screen ini hanya mengelola: loading state, handlers, dan layout wrapper.
 *
 * PERUBAHAN (FINISHING) — Audit B8/B10:
 *   - SUKSES export/import → toast.success (feedback ringan & satisfying),
 *     bukan Alert modal berat.
 *   - GAGAL tetap Alert — error butuh perhatian penuh user, modal tepat.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Spacing } from '../../constants/colors';
import BackupContent from '../../components/pengaturan/backup-content';
import { exportExcel, importExcel } from '../../lib/export/excel';
import { useToast } from '../../components/ui/toast';

type LoadingState = 'export' | 'import' | null;

export default function BackupScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState<LoadingState>(null);

  const handleExport = useCallback(async () => {
    setLoading('export');
    try {
      const res = await exportExcel();
      if (res.ok) {
        toast.success(res.pesan ?? 'Data berhasil diekspor.');
      } else {
        Alert.alert('Gagal', res.pesan ?? 'Tidak bisa ekspor.');
      }
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mengekspor data. Coba lagi.');
    } finally {
      setLoading(null);
    }
  }, [toast]);

  const handleImport = useCallback(async () => {
    setLoading('import');
    try {
      const res = await importExcel();
      if (res.ok) {
        toast.success(res.pesan ?? `${res.jumlah ?? 0} baris diimpor.`);
      } else {
        Alert.alert('Gagal', res.pesan ?? 'Tidak bisa impor.');
      }
    } catch {
      Alert.alert('Gagal', 'Tidak bisa mengimpor data. Coba lagi.');
    } finally {
      setLoading(null);
    }
  }, [toast]);

  return (
    <>
      <Stack.Screen options={{ title: 'Backup & Restore' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackupContent
          loading={loading}
          onExport={() => { void handleExport(); }}
          onImport={() => { void handleImport(); }}
        />
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
  },
});
