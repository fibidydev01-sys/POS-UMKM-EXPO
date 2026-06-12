/**
 * StrukPreview — dialog konfirmasi transaksi berhasil + preview struk.
 *
 * DITULIS ULANG: pakai React Native <Modal> BAWAAN (center dialog).
 * Bukan AppModal custom, bukan react-native-modal, bukan bottom sheet — ini
 * memang dialog tengah sederhana tanpa drag/snap, jadi <Modal> polos paling
 * aman & tidak konflik dengan sheet native.
 *
 * PERUBAHAN v2:
 *   - Ikon ✓ & 🖨 diganti lucide (check, printer).
 *   - Font size dinamis via hitungStrukFont(); kertas auto-size; tombol height 52.
 *
 * PERUBAHAN (FINISHING) — Audit B4:
 *   - TOMBOL "BAGIKAN" baru: Share.share(teksStruk) — struk digital bisa
 *     dikirim via WhatsApp dll. Krusial untuk UMKM tanpa printer & untuk tester.
 *   - Layout aksi: [Cetak Struk] full-width, lalu baris [Bagikan][Selesai].
 *   - Tombol cetak saat loading: spinner + teks "Mencetak…" (bukan spinner polos).
 *
 * Perilaku dipertahankan:
 *  - Tap backdrop SENGAJA tidak menutup.
 *  - Back button Android menutup (onRequestClose → onSelesai).
 */

import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Platform, useWindowDimensions, Share,
} from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../ui/icon';
import type { UmkmConfig, Transaksi, TransactionItem } from '../../lib/db/database';
import { renderStrukText, hitungStrukFont } from '../../lib/printer/struk';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Padding dikurangi dari lebar modal untuk mendapat availableWidth struk.
const MODAL_OUTER_PAD = Spacing.xl * 2; // 48 — padding luar modal dari layar
const INNER_PAD = Spacing.xl * 2;       // 48 — padding inner (View style.inner)
const KERTAS_PAD = Spacing.md * 2;      // 24 — padding kartu kertas

interface Props {
  visible: boolean;
  config: UmkmConfig | null;
  trx: Transaksi | null;
  items: TransactionItem[];
  mencetak: boolean;
  onCetak: () => void;
  onSelesai: () => void;
}

export default function StrukPreview({
  visible, config, trx, items, mencetak, onCetak, onSelesai,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();

  const teks = config && trx ? renderStrukText(config, trx, items) : '';

  const modalWidth = Math.min(windowWidth - MODAL_OUTER_PAD, 460);
  const availableWidth = modalWidth - INNER_PAD - KERTAS_PAD;
  const fontMetrics = hitungStrukFont(config?.paper_width ?? 58, availableWidth);

  // Bagikan struk digital: share sheet OS (WhatsApp, email, salin, dst).
  const bagikan = async () => {
    if (!teks) return;
    try {
      await Share.share({ message: teks });
    } catch {
      // user batal / share gagal — tidak perlu feedback
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSelesai}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.inner}>
            <View style={styles.suksesBadge}>
              <Icon name="check" size={30} color={Colors.success} strokeWidth={3} />
            </View>
            <Text style={styles.suksesTeks}>Transaksi Berhasil</Text>
            {!!trx && <Text style={styles.orderNo}>Order #{trx.nomor_order}</Text>}

            <ScrollView
              style={styles.kertasWrap}
              contentContainerStyle={styles.kertasInner}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.kertas}>
                <Text
                  style={[
                    styles.mono,
                    {
                      fontFamily: MONO,
                      fontSize: fontMetrics.fontSize,
                      lineHeight: fontMetrics.lineHeight,
                    },
                  ]}
                >
                  {teks}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.aksi}>
              <Pressable
                onPress={onCetak}
                disabled={mencetak}
                style={({ pressed }) => [styles.btnCetak, pressed && styles.pressed]}
              >
                {mencetak ? (
                  <>
                    <ActivityIndicator color={Colors.onPrimary} />
                    <Text style={styles.btnCetakTeks}>Mencetak…</Text>
                  </>
                ) : (
                  <>
                    <Icon name="printer" size={18} color={Colors.onPrimary} />
                    <Text style={styles.btnCetakTeks}>Cetak Struk</Text>
                  </>
                )}
              </Pressable>

              {/* Bagikan (struk digital) + Selesai — sejajar */}
              <View style={styles.aksiBawah}>
                <Pressable
                  onPress={() => { void bagikan(); }}
                  style={({ pressed }) => [styles.btnBagikan, pressed && styles.pressed]}
                >
                  <Icon name="share" size={17} color={Colors.primary} strokeWidth={2.4} />
                  <Text style={styles.btnBagikanTeks}>Bagikan</Text>
                </Pressable>
                <Pressable
                  onPress={onSelesai}
                  style={({ pressed }) => [styles.btnSelesai, pressed && styles.pressed]}
                >
                  <Text style={styles.btnSelesaiTeks}>Selesai</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: Colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  sheet: {
    width: '100%', maxWidth: 460, maxHeight: '90%',
    backgroundColor: Colors.bg, borderRadius: Radii.xl, overflow: 'hidden',
    ...shadow(3),
  },
  inner: { padding: Spacing.xl },
  suksesBadge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.successSoft,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  suksesTeks: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  orderNo: {
    fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center',
    marginTop: 2, marginBottom: Spacing.lg,
  },

  kertasWrap: { maxHeight: 300, marginBottom: Spacing.lg },
  kertasInner: { alignItems: 'center' },
  kertas: {
    backgroundColor: '#FFFFFF', borderRadius: Radii.sm, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    alignSelf: 'center',
    ...shadow(1),
  },
  mono: {
    color: Colors.text,
  },

  aksi: { gap: Spacing.md },
  btnCetak: {
    height: 52,
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    flexDirection: 'row', gap: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(1),
  },
  btnCetakTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
  aksiBawah: { flexDirection: 'row', gap: Spacing.md },
  btnBagikan: {
    flex: 1, height: 52,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    flexDirection: 'row', gap: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  btnBagikanTeks: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.md },
  btnSelesai: {
    flex: 1, height: 52,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnSelesaiTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  pressed: { opacity: 0.85 },
});
