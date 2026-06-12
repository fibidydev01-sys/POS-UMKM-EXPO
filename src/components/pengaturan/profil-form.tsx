/**
 * ProfilForm — form profil usaha (nama, alamat, telepon, footer, tombol simpan).
 *
 * Dipecah dari pengaturan.tsx. Self-contained dengan field-field form.
 * State di-manage oleh halaman profil.tsx, dikomunikasikan via props.
 *
 * PERUBAHAN (KONSISTENSI):
 *   - Tombol "Simpan Profil": paddingVertical saja → height: 52 eksplisit.
 *     Konsisten dengan semua tombol aksi utama di modul pengaturan:
 *     backup.tsx, preset-diskon.tsx, pembayaran.tsx.
 *   - Tambah justifyContent: 'center' karena tidak pakai paddingVertical lagi.
 */
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import type { IconName } from '../ui/icon';
import Icon from '../ui/icon';

interface ProfilFormProps {
  namaUsaha: string;
  alamat: string;
  telepon: string;
  footer: string;
  profilTersimpan: boolean;
  onChangeNama: (v: string) => void;
  onChangeAlamat: (v: string) => void;
  onChangeTelepon: (v: string) => void;
  onChangeFooter: (v: string) => void;
  onSimpan: () => void;
}

export default function ProfilForm({
  namaUsaha,
  alamat,
  telepon,
  footer,
  profilTersimpan,
  onChangeNama,
  onChangeAlamat,
  onChangeTelepon,
  onChangeFooter,
  onSimpan,
}: ProfilFormProps) {
  return (
    <View style={styles.card}>
      <Field
        label="Nama Usaha"
        icon="store"
        value={namaUsaha}
        onChange={onChangeNama}
        placeholder="cth: Warung Kopi Senja"
      />
      <Field
        label="Alamat"
        icon="map-pin"
        value={alamat}
        onChange={onChangeAlamat}
        placeholder="Alamat singkat"
        multiline
      />
      <Field
        label="Telepon"
        icon="phone"
        value={telepon}
        onChange={onChangeTelepon}
        placeholder="08xx"
        keyboardType="phone-pad"
      />
      <Field
        label="Catatan kaki struk"
        icon="file"
        value={footer}
        onChange={onChangeFooter}
        placeholder="cth: Terima kasih atas kunjungan Anda"
        multiline
      />
      <Pressable
        style={styles.btnPrimary}
        onPress={onSimpan}
      >
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
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  icon,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'phone-pad' | 'default';
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow(1),
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldMultiline: { minHeight: 56, textAlignVertical: 'top' },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    // height: 52 eksplisit — seragam dengan semua tombol aksi di modul pengaturan
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...shadow(1),
  },
  btnPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btnPrimaryTxt: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
});
