/**
 * form-preset.tsx — Form tambah / edit preset diskon.
 *
 * Dipecah dari pengaturan/preset-diskon.tsx (mode form).
 * Menerima semua state form sebagai props + callbacks.
 * Menampilkan field nama, field persen, error, tombol hapus (edit only),
 * dan tombol simpan.
 *
 * PERUBAHAN (FINISHING) — Audit B9 + B8:
 *   - ERROR PER-FIELD: prop `errorField` ('nama' | 'persen' | null) → input
 *     yang salah dapat border merah + latar dangerSoft, dan teks error tampil
 *     INLINE tepat di bawah field tersebut (bukan menumpuk di bawah card).
 *   - PREVIEW HEMAT REAL-TIME: saat persen valid, tampil contoh
 *     "20% dari Rp100.000 = hemat Rp20.000" agar UMKM langsung paham dampak.
 *   - SAVING STATE: prop `saving` → tombol simpan disabled + "Menyimpan…"
 *     (cegah double-submit).
 */
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { DiskonPreset } from '../../lib/db/database';

/** Field yang sedang error — dipakai untuk border merah per-input. */
export type PresetErrorField = 'nama' | 'persen' | null;

interface FormPresetProps {
  editPreset: DiskonPreset | null;
  nama: string;
  persen: string;
  error: string;
  /** Field mana yang invalid (untuk border merah + posisi pesan error). */
  errorField?: PresetErrorField;
  /** true selama proses simpan — tombol disabled + "Menyimpan…". */
  saving?: boolean;
  onChangeNama: (t: string) => void;
  onChangePersen: (t: string) => void;
  onSimpan: () => void;
  onHapus: (p: DiskonPreset) => void;
}

// Basis contoh untuk preview hemat.
const CONTOH_HARGA = 100000;

export default function FormPreset({
  editPreset,
  nama,
  persen,
  error,
  errorField = null,
  saving = false,
  onChangeNama,
  onChangePersen,
  onSimpan,
  onHapus,
}: FormPresetProps) {
  const persenInt = parseInt(persen, 10);
  const persenValid = !isNaN(persenInt) && persenInt > 0 && persenInt <= 100;
  const hemat = persenValid ? Math.round((CONTOH_HARGA * persenInt) / 100) : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Nama Preset</Text>
          <TextInput
            style={[styles.formInput, errorField === 'nama' && styles.inputError]}
            value={nama}
            onChangeText={onChangeNama}
            placeholder="cth: Member, Promo Akhir Pekan"
            placeholderTextColor={Colors.textSubtle}
            autoFocus
          />
          {errorField === 'nama' && !!error && (
            <Text style={styles.errorInline}>{error}</Text>
          )}

          <Text style={styles.formLabel}>Persen Diskon</Text>
          <View style={[styles.persenWrap, errorField === 'persen' && styles.inputError]}>
            <TextInput
              style={styles.persenInput}
              value={persen}
              onChangeText={onChangePersen}
              placeholder="0"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.persenSuffix}>%</Text>
          </View>
          {errorField === 'persen' && !!error && (
            <Text style={styles.errorInline}>{error}</Text>
          )}

          {/* Preview hemat real-time — bantu UMKM paham dampak diskon */}
          {persenValid && (
            <Text style={styles.previewHemat}>
              {persenInt}% dari {formatRupiah(CONTOH_HARGA)} = hemat {formatRupiah(hemat)}
            </Text>
          )}

          {/* Error umum (mis. gagal simpan ke DB) — tetap di bawah card */}
          {errorField === null && !!error && (
            <Text style={styles.errorTeks}>{error}</Text>
          )}
        </View>

        <View style={styles.aksiRow}>
          {editPreset && (
            <Pressable
              style={styles.btnHapus}
              onPress={() => onHapus(editPreset)}
              disabled={saving}
            >
              <Icon name="trash" size={18} color={Colors.danger} />
              <Text style={styles.btnHapusTeks}>Hapus</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.btnSimpan, saving && styles.btnOff]}
            onPress={onSimpan}
            disabled={saving}
          >
            <Text style={styles.btnSimpanTeks}>
              {saving
                ? 'Menyimpan…'
                : editPreset ? 'Simpan Perubahan' : 'Tambah Preset'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow(1),
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
  persenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  persenInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  persenSuffix: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  previewHemat: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  errorTeks: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  aksiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  btnHapus: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl,
  },
  btnHapusTeks: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  btnSimpan: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(1),
  },
  btnOff: { opacity: 0.6 },
  btnSimpanTeks: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
});
