/**
 * form-promo.tsx — Form tambah program promo (BOGO / Buy2Get1).
 *
 * Dipecah dari app/promo.tsx (mode form).
 * Tiga card: Tipe Promo, Produk Target, Periode (opsional).
 * Error text + tombol Simpan Promo.
 *
 * PERUBAHAN (FINISHING) — Audit B8 + B9:
 *   - MASK TANGGAL OTOMATIS: user cukup ketik ANGKA (20260615) → otomatis
 *     terformat "2026-06-15". keyboardType number-pad, maxLength 10, dengan
 *     hint "Ketik angka saja — tanda hubung otomatis." Menghapus juga aman
 *     karena mask dihitung ulang dari digit murni tiap perubahan.
 *   - ERROR PER-FIELD: prop `errorField` ('produk' | 'mulai' | 'selesai' |
 *     null) → border merah pada elemen yang salah; pesan error tetap satu
 *     di bawah (dekat tombol) supaya layout 2 kolom tanggal tidak melompat.
 *   - SAVING STATE: prop `saving` → tombol "Menyimpan…" + disabled.
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
import type { MenuItem } from '../../lib/db/database';

type PromoTipe = 'bogo' | 'buy2get1';

/** Field yang sedang error — untuk border merah per-elemen. */
export type PromoErrorField = 'produk' | 'mulai' | 'selesai' | null;

interface FormPromoProps {
  menu: MenuItem[];
  tipe: PromoTipe;
  menuItemId: number | null;
  mulai: string;
  selesai: string;
  error: string;
  /** Elemen mana yang invalid (border merah). */
  errorField?: PromoErrorField;
  /** true selama simpan — tombol "Menyimpan…" + disabled. */
  saving?: boolean;
  onChangeTipe: (t: PromoTipe) => void;
  onChangeMenuId: (id: number) => void;
  onChangeMulai: (s: string) => void;
  onChangeSelesai: (s: string) => void;
  onClearError: () => void;
  onSimpan: () => void;
}

/**
 * Mask tanggal: ambil digit murni dari input, susun ulang jadi YYYY-MM-DD
 * secara progresif. "2026" → "2026", "202606" → "2026-06",
 * "20260615" → "2026-06-15". Aman untuk hapus karakter (mask dihitung ulang).
 */
function maskTanggal(teks: string): string {
  const d = teks.replace(/[^0-9]/g, '').slice(0, 8); // maksimal 8 digit
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export default function FormPromo({
  menu,
  tipe,
  menuItemId,
  mulai,
  selesai,
  error,
  errorField = null,
  saving = false,
  onChangeTipe,
  onChangeMenuId,
  onChangeMulai,
  onChangeSelesai,
  onClearError,
  onSimpan,
}: FormPromoProps) {
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
        {/* ── Tipe Promo ── */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Tipe Promo</Text>
          <View style={styles.tipeRow}>
            <Pressable
              style={[styles.tipeCard, tipe === 'bogo' && styles.tipeCardAktif]}
              onPress={() => { onChangeTipe('bogo'); onClearError(); }}
            >
              <Text style={[styles.tipeJudul, tipe === 'bogo' && styles.tipeJudulAktif]}>
                Beli 1 Gratis 1
              </Text>
              <Text style={[styles.tipeKet, tipe === 'bogo' && styles.tipeKetAktif]}>
                Beli 1 dapat 1 gratis
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tipeCard, tipe === 'buy2get1' && styles.tipeCardAktif]}
              onPress={() => { onChangeTipe('buy2get1'); onClearError(); }}
            >
              <Text style={[styles.tipeJudul, tipe === 'buy2get1' && styles.tipeJudulAktif]}>
                Beli 2 Gratis 1
              </Text>
              <Text style={[styles.tipeKet, tipe === 'buy2get1' && styles.tipeKetAktif]}>
                Beli 2 dapat 1 gratis
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Produk Target ── */}
        <View style={[styles.formCard, errorField === 'produk' && styles.cardError]}>
          <Text style={styles.formLabel}>Produk Target</Text>
          {menu.length === 0 ? (
            <Text style={styles.produkKosong}>
              Belum ada produk. Tambahkan di tab Menu terlebih dahulu.
            </Text>
          ) : (
            <View style={styles.produkGrid}>
              {menu.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => { onChangeMenuId(m.id); onClearError(); }}
                  style={[
                    styles.produkChip,
                    menuItemId === m.id && styles.produkChipAktif,
                  ]}
                >
                  <Text
                    style={[
                      styles.produkTxt,
                      menuItemId === m.id && styles.produkTxtAktif,
                    ]}
                    numberOfLines={1}
                  >
                    {m.nama}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Periode (opsional) ── */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Periode (opsional)</Text>
          <Text style={styles.formHint}>
            Kosongkan = promo selalu aktif. Ketik angka saja — tanda hubung otomatis.
          </Text>
          <View style={styles.tanggalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tanggalKet}>Mulai</Text>
              <TextInput
                style={[styles.formInput, errorField === 'mulai' && styles.inputError]}
                value={mulai}
                onChangeText={(t) => { onChangeMulai(maskTanggal(t)); onClearError(); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tanggalKet}>Selesai</Text>
              <TextInput
                style={[styles.formInput, errorField === 'selesai' && styles.inputError]}
                value={selesai}
                onChangeText={(t) => { onChangeSelesai(maskTanggal(t)); onClearError(); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.errorTeks}>{error}</Text>}

        <Pressable
          style={[styles.btnSimpan, saving && styles.btnOff]}
          onPress={onSimpan}
          disabled={saving}
        >
          <Text style={styles.btnSimpanTeks}>
            {saving ? 'Menyimpan…' : 'Simpan Promo'}
          </Text>
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...shadow(1),
  },
  // Card produk target saat belum dipilih → border merah.
  cardError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  formHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 17,
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
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  tipeRow: { flexDirection: 'row', gap: Spacing.md },
  tipeCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tipeCardAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  tipeJudul: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted, marginBottom: 2 },
  tipeJudulAktif: { color: Colors.primaryDark },
  tipeKet: { fontSize: FontSize.xs, color: Colors.textMuted },
  tipeKetAktif: { color: Colors.primary },
  produkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  produkChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '100%',
  },
  produkChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  produkTxt: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  produkTxtAktif: { color: Colors.onPrimary },
  produkKosong: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
  tanggalRow: { flexDirection: 'row', gap: Spacing.md },
  tanggalKet: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  errorTeks: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
    marginTop: -Spacing.sm,
  },
  btnSimpan: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(1),
  },
  btnOff: { opacity: 0.6 },
  btnSimpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});
