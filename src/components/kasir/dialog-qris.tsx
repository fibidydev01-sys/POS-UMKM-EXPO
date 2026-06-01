/**
 * dialog-qris.tsx — dialog pembayaran QRIS.
 *
 * Menampilkan QR (react-native-qrcode-svg), countdown kedaluwarsa, dan status
 * dari state machine usePaymentSession. Saat paid → tampil sukses & panggil
 * onPaid(transaksiId) agar layar kasir membuka struk.
 *
 * Memakai React Native <Modal> bawaan (center dialog) — konsisten dgn StrukPreview.
 */
import { useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import { formatRupiah } from '../../lib/utils/currency';
import type { FaseBayar } from '../../lib/payment/use-payment-session';
import type { PaymentSession } from '../../lib/db/payment-session';

interface Props {
  visible: boolean;
  fase: FaseBayar;
  session: PaymentSession | null;
  sisaDetik: number;
  error: string | null;
  /** true saat polling sedang backoff karena jaringan bermasalah. */
  jaringanBermasalah?: boolean;
  amount: number;
  onTutup: () => void;
  onBuatUlang: () => void;
  onPaid: () => void;
  /** Lifecycle polling (doc 02b): nyala saat modal QR terlihat, mati saat tidak. */
  onStartPolling?: () => void;
  onStopPolling?: () => void;
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DialogQris({
  visible, fase, session, sisaDetik, error, jaringanBermasalah = false, amount,
  onTutup, onBuatUlang, onPaid, onStartPolling, onStopPolling,
}: Props) {
  // Lifecycle-aware polling (doc 02b): modal terlihat → polling NYALA;
  // modal tertutup / komponen unmount → polling MATI total. UI lifecycle =
  // polling lifecycle. Saat fase jadi paid, modal akan ditutup oleh parent
  // sehingga cleanup ini ikut mematikan polling secara natural — tidak perlu
  // mematikan polling secara manual di cabang 'paid'.
  useEffect(() => {
    if (!visible) {
      // Tidak terlihat: pastikan polling mati.
      onStopPolling?.();
      return;
    }
    onStartPolling?.();
    return () => { onStopPolling?.(); };
  }, [visible, onStartPolling, onStopPolling]);

  // Saat paid, beri jeda kecil agar pengguna lihat centang, lalu lanjut ke struk.
  useEffect(() => {
    if (fase !== 'paid') return;
    const t = setTimeout(onPaid, 900);
    return () => clearTimeout(t);
  }, [fase, onPaid]);

  const judul =
    fase === 'creating' ? 'Membuat QR…'
    : fase === 'pending' ? 'Scan untuk Bayar'
    : fase === 'paid' ? 'Pembayaran Diterima'
    : fase === 'expired' ? 'QR Kedaluwarsa'
    : fase === 'failed' ? 'Pembayaran Gagal'
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onTutup}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.inner}>
            <Text style={styles.judul}>{judul}</Text>
            <Text style={styles.amount}>{formatRupiah(amount)}</Text>

            {/* CREATING */}
            {fase === 'creating' && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.info}>Menghubungi penyedia pembayaran…</Text>
              </View>
            )}

            {/* PENDING — tampil QR */}
            {fase === 'pending' && session && (
              <>
                <View style={styles.qrWrap}>
                  <QRCode value={session.qr_string} size={220} backgroundColor="#FFFFFF" color="#000000" />
                </View>
                <View style={styles.countRow}>
                  <Icon name="calendar" size={16} color={Colors.textMuted} />
                  <Text style={styles.count}>Berlaku {mmss(sisaDetik)}</Text>
                </View>
                <View style={styles.pollRow}>
                  <ActivityIndicator size="small" color={jaringanBermasalah ? Colors.warning : Colors.accent} />
                  <Text style={[styles.pollTeks, jaringanBermasalah && styles.pollTeksWarn]}>
                    {jaringanBermasalah ? 'Koneksi bermasalah, mengecek…' : 'Menunggu pembayaran…'}
                  </Text>
                </View>
              </>
            )}

            {/* PAID */}
            {fase === 'paid' && (
              <View style={styles.center}>
                <View style={styles.okBadge}>
                  <Icon name="check" size={34} color={Colors.success} strokeWidth={3} />
                </View>
                <Text style={styles.okTeks}>Lunas. Menyiapkan struk…</Text>
              </View>
            )}

            {/* EXPIRED / FAILED */}
            {(fase === 'expired' || fase === 'failed') && (
              <View style={styles.center}>
                <View style={styles.errBadge}>
                  <Icon name="warning" size={32} color={Colors.danger} strokeWidth={2.2} />
                </View>
                <Text style={styles.errTeks}>
                  {error ?? (fase === 'expired' ? 'QR sudah kedaluwarsa.' : 'Pembayaran tidak berhasil.')}
                </Text>
              </View>
            )}

            {/* Aksi */}
            <View style={styles.aksi}>
              {(fase === 'expired' || fase === 'failed') && (
                <Pressable style={styles.btnUlang} onPress={onBuatUlang}>
                  <Text style={styles.btnUlangTeks}>Buat Ulang</Text>
                </Pressable>
              )}
              {fase !== 'paid' && (
                <Pressable style={styles.btnTutup} onPress={onTutup}>
                  <Text style={styles.btnTutupTeks}>
                    {fase === 'pending' ? 'Batalkan' : 'Tutup'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: Colors.bg, borderRadius: Radii.xl, overflow: 'hidden', ...shadow(3) },
  inner: { padding: Spacing.xl, alignItems: 'center' },
  judul: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  amount: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, marginTop: 2, marginBottom: Spacing.lg },
  center: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  info: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  qrWrap: {
    backgroundColor: '#FFFFFF', padding: Spacing.lg, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg },
  count: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  pollTeks: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700' },
  pollTeksWarn: { color: Colors.warning },

  okBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  okTeks: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  errBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  errTeks: { fontSize: FontSize.sm, color: Colors.text, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  aksi: { width: '100%', gap: Spacing.md, marginTop: Spacing.lg },
  btnUlang: { height: 52, backgroundColor: Colors.primary, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  btnUlangTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
  btnTutup: { height: 52, backgroundColor: Colors.surface, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  btnTutupTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
});
