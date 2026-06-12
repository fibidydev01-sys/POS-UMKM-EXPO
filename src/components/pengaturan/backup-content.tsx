/**
 * backup-content.tsx — Konten halaman Backup & Restore.
 *
 * Dipecah dari pengaturan/backup.tsx.
 * Menampilkan tiga card: Export, Import (+ warning), dan Info format.
 * Menerima loading state terpusat agar kedua tombol bisa disable
 * bersamaan tanpa prop drilling ganda.
 *
 * PERUBAHAN (FINISHING) — Audit "teks progress saat loading":
 *   - Tombol export loading: spinner + "Mengekspor…" (bukan spinner polos).
 *   - Tombol import loading: spinner + "Mengimpor…".
 */
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';

type LoadingState = 'export' | 'import' | null;

interface BackupContentProps {
  loading: LoadingState;
  onExport: () => void;
  onImport: () => void;
}

export default function BackupContent({ loading, onExport, onImport }: BackupContentProps) {
  return (
    <>
      {/* ── Card Export ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Icon name="download" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardJudul}>Export ke Excel</Text>
            <Text style={styles.cardKet}>
              Simpan seluruh data transaksi, item, dan menu ke file .xlsx
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            pressed && styles.btnPressed,
            loading !== null && styles.btnDisabled,
          ]}
          onPress={onExport}
          disabled={loading !== null}
        >
          {loading === 'export' ? (
            <>
              <ActivityIndicator color={Colors.onPrimary} />
              <Text style={styles.btnPrimaryTeks}>Mengekspor…</Text>
            </>
          ) : (
            <>
              <Icon name="download" size={18} color={Colors.onPrimary} />
              <Text style={styles.btnPrimaryTeks}>Export Sekarang</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* ── Card Import ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, styles.iconWrapAlt]}>
            <Icon name="upload" size={22} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardJudul}>Import dari Excel</Text>
            <Text style={styles.cardKet}>
              Pulihkan data dari file backup .xlsx yang pernah di-export
            </Text>
          </View>
        </View>

        <View style={styles.warnBox}>
          <Icon name="warning" size={16} color={Colors.warning} strokeWidth={2.4} />
          <Text style={styles.warnTeks}>
            Import akan mengganti SEMUA data transaksi yang ada saat ini.
            Pastikan sudah export dulu sebelum import.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnOutline,
            pressed && styles.btnPressed,
            loading !== null && styles.btnDisabled,
          ]}
          onPress={onImport}
          disabled={loading !== null}
        >
          {loading === 'import' ? (
            <>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.btnOutlineTeks}>Mengimpor…</Text>
            </>
          ) : (
            <>
              <Icon name="upload" size={18} color={Colors.primary} />
              <Text style={styles.btnOutlineTeks}>Pilih File & Import</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* ── Card Info ── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoJudul}>Format file backup</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoTeks}>
            File Excel (.xlsx) berisi 3 sheet: Transaksi, Item Transaksi, dan Menu.
          </Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoTeks}>
            Export akan membuka share sheet HP — simpan ke Google Drive,
            WhatsApp, email, atau penyimpanan lokal.
          </Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoTeks}>
            Hanya file backup dari aplikasi ini yang bisa diimport kembali.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    ...shadow(1),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapAlt: {
    backgroundColor: Colors.successSoft,
  },
  cardJudul: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  cardKet: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  warnTeks: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    lineHeight: 17,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    height: 52,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    ...shadow(1),
  },
  btnPrimaryTeks: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  btnOutline: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnOutlineTeks: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.6 },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...shadow(1),
  },
  infoJudul: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  infoTeks: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
