/**
 * StrukPreview — dialog konfirmasi transaksi berhasil + preview struk.
 *
 * DITULIS ULANG: pakai React Native <Modal> BAWAAN (center dialog).
 * Bukan AppModal custom, bukan react-native-modal, bukan bottom sheet — ini
 * memang dialog tengah sederhana tanpa drag/snap, jadi <Modal> polos paling
 * aman & tidak konflik dengan sheet native.
 *
 * Perilaku dipertahankan:
 *  - Tap backdrop SENGAJA tidak menutup (agar struk tidak tertutup tak sengaja
 *    sebelum dicetak). Hanya tombol "Selesai" yang menutup.
 *  - Back button Android menutup (onRequestClose → onSelesai).
 */

import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { UmkmConfig, Transaksi, TransactionItem } from '../../lib/db/database';
import { renderStrukText } from '../../lib/printer/struk';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
  const teks = config && trx ? renderStrukText(config, trx, items) : '';

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
              <Text style={styles.suksesIcon}>✓</Text>
            </View>
            <Text style={styles.suksesTeks}>Transaksi Berhasil</Text>
            {!!trx && <Text style={styles.orderNo}>Order #{trx.nomor_order}</Text>}

            <ScrollView
              style={styles.kertasWrap}
              contentContainerStyle={styles.kertasInner}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.kertas}>
                <Text style={styles.mono}>{teks}</Text>
              </View>
            </ScrollView>

            <View style={styles.aksi}>
              <Pressable
                onPress={onCetak}
                disabled={mencetak}
                style={({ pressed }) => [styles.btnCetak, pressed && styles.pressed]}
              >
                {mencetak ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.btnCetakTeks}>🖨  Cetak Struk</Text>
                )}
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
  suksesIcon: { fontSize: 30, color: Colors.success, fontWeight: '800' },
  suksesTeks: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  orderNo: {
    fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center',
    marginTop: 2, marginBottom: Spacing.lg,
  },
  kertasWrap: { maxHeight: 320, marginBottom: Spacing.lg },
  kertasInner: { alignItems: 'center' },
  kertas: {
    backgroundColor: '#FFFFFF', borderRadius: Radii.sm, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, width: '100%', ...shadow(1),
  },
  mono: { fontFamily: MONO, fontSize: 11, color: Colors.text, lineHeight: 16 },
  aksi: { gap: Spacing.md },
  btnCetak: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    minHeight: 52, justifyContent: 'center', ...shadow(1),
  },
  btnCetakTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
  btnSelesai: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnSelesaiTeks: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  pressed: { opacity: 0.85 },
});
