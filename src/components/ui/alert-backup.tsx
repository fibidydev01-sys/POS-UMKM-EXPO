/**
 * AlertBackup — banner pengingat backup data di dashboard.
 *
 * DIPINDAH: components/shared/alert-backup.tsx → components/ui/alert-backup.tsx
 * Update import di: src/app/(tabs)/index.tsx
 *
 * PERUBAHAN (FINISHING):
 *   - Prop opsional `loading`: tombol "Backup Sekarang" kini bisa menampilkan
 *     spinner + teks "Mengekspor…" dan ter-disable selama export berjalan.
 *     Dipakai beranda yang sekarang men-trigger exportExcel() LANGSUNG dari
 *     banner ini (Audit B6 — tidak lagi navigate ke Pengaturan dulu).
 */
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from './icon';

interface Props {
  onBackup: () => void;
  onTutup: () => void;
  /** true selama exportExcel() berjalan — tombol disabled + "Mengekspor…". */
  loading?: boolean;
}

export default function AlertBackup({ onBackup, onTutup, loading = false }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.kiri}>
        <View style={styles.judulRow}>
          <Icon name="save" size={18} color={Colors.warning} />
          <Text style={styles.judul}>Sudah backup data?</Text>
        </View>
        <Text style={styles.teks}>
          Amankan transaksi Anda ke Excel. Tersimpan di HP, bisa hilang jika aplikasi dihapus.
        </Text>
        <View style={styles.aksiRow}>
          <Pressable
            onPress={onBackup}
            disabled={loading}
            style={[styles.btn, loading && styles.btnOff]}
          >
            {loading ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator size="small" color={Colors.onPrimary} />
                <Text style={styles.btnTeks}>Mengekspor…</Text>
              </View>
            ) : (
              <Text style={styles.btnTeks}>Backup Sekarang</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onTutup}
            hitSlop={8}
            style={styles.tutup}
            disabled={loading}
          >
            <Text style={styles.tutupTeks}>Nanti</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0D9A8',
  },
  kiri: { gap: Spacing.xs },
  judulRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.warning },
  teks: { fontSize: FontSize.sm, color: '#8A6D1F', lineHeight: 19 },
  aksiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.warning,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  btnOff: { opacity: 0.7 },
  btnLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btnTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.sm },
  tutup: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  tutupTeks: { color: '#8A6D1F', fontWeight: '700', fontSize: FontSize.sm },
});
