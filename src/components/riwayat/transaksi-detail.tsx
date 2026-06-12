/**
 * TransaksiDetail — konten BottomSheet detail transaksi + refund mode.
 *
 * Dipecah dari riwayat.tsx. Mengelola dua mode via prop refundMode:
 *   false → tampilan detail (struk + aksi Void/Refund/Cetak)
 *   true  → form alasan refund
 *
 * Komponen ini TIDAK membuka/menutup sheet — itu tanggung jawab riwayat.tsx.
 * Komponen ini hanya merender konten di dalam sheet.
 *
 * PERUBAHAN (FINISHING):
 *   - Tombol Void loading: ActivityIndicator (bukan teks '…') — Audit B5.
 *   - Input alasan refund → BottomSheetTextInput: TextInput RN biasa di dalam
 *     sheet native bermasalah dengan keyboard (lihat aturan bottom-sheet.tsx).
 *   - Tombol BAGIKAN baru (ikon share kotak) di aksiRow: Share.share(teksStruk)
 *     — kirim ulang struk digital dari riwayat tanpa printer (Audit B4/B5).
 */
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Share } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '../ui/bottom-sheet';
import Icon from '../ui/icon';
import Badge from '../ui/badge';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { features } from '../../lib/config/features';
import { renderStrukText } from '../../lib/printer/struk';
import type { StrukFontMetrics } from '../../lib/printer/struk';
import type { Transaksi, TransactionItem, UmkmConfig } from '../../lib/db/database';

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  detail: Transaksi | null;
  detailItems: TransactionItem[];
  config: UmkmConfig | null;
  fontMetrics: StrukFontMetrics;
  refundMode: boolean;
  refundAlasan: string;
  voidLoading: boolean;
  mencetak: boolean;
  refundLoading: boolean;
  onTutup: () => void;
  onVoid: () => void;
  onCetak: () => void;
  onSubmitRefund: () => void;
  setRefundMode: (v: boolean) => void;
  setRefundAlasan: (v: string) => void;
}

function labelStatus(s: Transaksi['status']): string {
  if (s === 'void') return 'VOID';
  if (s === 'refund') return 'REFUND';
  return '';
}

export default function TransaksiDetail({
  detail,
  detailItems,
  config,
  fontMetrics,
  refundMode,
  refundAlasan,
  voidLoading,
  mencetak,
  refundLoading,
  onVoid,
  onCetak,
  onSubmitRefund,
  setRefundMode,
  setRefundAlasan,
}: Props) {
  if (!detail) return null;

  const teksStruk =
    config && detail ? renderStrukText(config, detail, detailItems) : '';
  const statusBatal = detail.status !== 'completed';

  // Bagikan struk digital dari riwayat (cetak ulang tanpa printer).
  const bagikan = async () => {
    if (!teksStruk) return;
    try {
      await Share.share({ message: teksStruk });
    } catch {
      // user batal — abaikan
    }
  };

  if (refundMode) {
    return (
      <View style={styles.refundBody}>
        <Text style={styles.formSub}>
          {detail.nomor_order} · {formatRupiah(detail.grand_total)}
        </Text>
        <Text style={styles.formLabel}>Alasan refund *</Text>
        {/* BottomSheetTextInput: wajib di dalam sheet native (lihat bottom-sheet.tsx) */}
        <BottomSheetTextInput
          style={styles.formInput}
          value={refundAlasan}
          onChangeText={setRefundAlasan}
          placeholder="cth: Pesanan salah, pelanggan komplain"
          placeholderTextColor={Colors.textSubtle}
          multiline
          autoFocus
        />
        <View style={styles.formAksi}>
          <Pressable
            style={styles.formBatal}
            onPress={() => setRefundMode(false)}
          >
            <Text style={styles.formBatalTxt}>Batal</Text>
          </Pressable>
          <Pressable
            style={[styles.formConfirm, refundLoading && { opacity: 0.6 }]}
            onPress={onSubmitRefund}
            disabled={refundLoading}
          >
            {refundLoading ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator size="small" color={Colors.onPrimary} />
                <Text style={styles.formConfirmTxt}>Memproses…</Text>
              </View>
            ) : (
              <Text style={styles.formConfirmTxt}>Proses Refund</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.detailBody}>
      {/* Info void/refund bila ada — info yang tidak ada di struk */}
      {statusBatal && detail.void_reason ? (
        <View
          style={[
            styles.voidInfo,
            detail.status === 'refund' && styles.refundInfo,
          ]}
        >
          <Text
            style={[
              styles.voidInfoTeks,
              detail.status === 'refund' && styles.refundInfoTeks,
            ]}
          >
            Alasan {detail.status === 'refund' ? 'refund' : 'void'}:{' '}
            {detail.void_reason}
          </Text>
        </View>
      ) : null}

      {/* Status badge di dalam body (duplikasi dari header untuk konteks) */}
      {statusBatal && (
        <View style={styles.statusRow}>
          <Badge
            variant={detail.status === 'refund' ? 'warning' : 'danger'}
            label={labelStatus(detail.status)}
            size="sm"
          />
        </View>
      )}

      {/* Struk scrollable */}
      <BottomSheetScrollView
        style={styles.strukScroll}
        contentContainerStyle={styles.strukScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.kertas}>
          <Text
            style={[
              styles.strukText,
              {
                fontFamily: MONO as string,
                fontSize: fontMetrics.fontSize,
                lineHeight: fontMetrics.lineHeight,
              },
            ]}
          >
            {teksStruk}
          </Text>
        </View>
      </BottomSheetScrollView>

      {/* Tombol aksi — height 52 semua */}
      <View style={styles.aksiRow}>
        {detail.status === 'completed' && (
          <Pressable
            style={[styles.aksiBtn, styles.aksiVoid]}
            onPress={onVoid}
            disabled={voidLoading}
          >
            {voidLoading ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <Text style={styles.aksiVoidTxt}>Void</Text>
            )}
          </Pressable>
        )}
        {features.refund && detail.status === 'completed' && (
          <Pressable
            style={[styles.aksiBtn, styles.aksiRefund]}
            onPress={() => {
              setRefundAlasan('');
              setRefundMode(true);
            }}
          >
            <Text style={styles.aksiRefundTxt}>Refund</Text>
          </Pressable>
        )}
        {/* Bagikan struk digital — ikon kotak, hemat lebar */}
        <Pressable
          style={[styles.aksiBtn, styles.aksiShare]}
          onPress={() => { void bagikan(); }}
        >
          <Icon name="share" size={19} color={Colors.primary} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          style={[
            styles.aksiBtn,
            styles.aksiCetak,
            mencetak && { opacity: 0.6 },
          ]}
          onPress={onCetak}
          disabled={mencetak}
        >
          <Icon name="printer" size={18} color={Colors.onPrimary} />
          <Text style={styles.aksiCetakTxt}>
            {mencetak ? 'Mencetak…' : 'Cetak'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailBody: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  statusRow: { marginBottom: Spacing.sm },
  voidInfo: {
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  voidInfoTeks: { color: Colors.danger, fontSize: FontSize.sm },
  refundInfo: { backgroundColor: Colors.warningSoft },
  refundInfoTeks: { color: Colors.warning },

  strukScroll: { flex: 1, marginBottom: Spacing.sm },
  strukScrollContent: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  kertas: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'center',
    ...shadow(1),
  },
  strukText: { color: Colors.text },

  aksiRow: { flexDirection: 'row', gap: Spacing.sm },
  aksiBtn: {
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aksiVoid: {
    backgroundColor: Colors.dangerSoft,
    paddingHorizontal: Spacing.lg,
    minWidth: 70,
  },
  aksiVoidTxt: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  aksiRefund: {
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: Spacing.lg,
  },
  aksiRefundTxt: {
    color: Colors.warning,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  aksiShare: {
    width: 52,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  aksiCetak: { flex: 1, backgroundColor: Colors.primary },
  aksiCetakTxt: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },

  // Refund mode
  refundBody: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  formSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
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
    minHeight: 64,
    textAlignVertical: 'top',
  },
  formAksi: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  formBatal: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBatalTxt: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  formConfirm: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.warning,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formConfirmTxt: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
