/**
 * Riwayat — daftar transaksi + detail + void + refund.
 *
 * DITULIS ULANG untuk @expo/ui (sheet native):
 *   SATU sheet "Detail". Refund BUKAN sheet kedua, melainkan TUKAR-ISI di
 *   dalam sheet yang sama (state `refundMode`). Tidak ada penumpukan dua sheet
 *   native (yang perilakunya tidak konsisten antar platform).
 *
 *   refundMode=false → tampilan detail (struk scrollable + aksi Void/Refund/Cetak)
 *   refundMode=true  → form alasan refund
 *
 * PERUBAHAN v2:
 *   - Struk dibungkus ScrollView agar bisa scroll untuk struk panjang.
 *   - Font size dihitung dinamis via hitungStrukFont() agar tidak wrap.
 *   - Kertas (kartu putih) align sendiri ke konten, tanpa fixed width.
 *   - Semua tombol aksi drawer → height: 52 untuk konsistensi.
 *   - BottomSheet tidak mengirim snapPoints (diabaikan oleh wrapper).
 *
 * Tombol & form Refund hanya tampil saat features.refund aktif (V2).
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Alert,
  Platform, TextInput, ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { Transaksi, TransactionItem, UmkmConfig, PaymentMethod } from '../../lib/db/database';
import { getRiwayat, getItemsByTransaksi, voidTransaksi, refundTransaksi } from '../../lib/db/transaksi';
import { getConfig } from '../../lib/db/pengaturan';
import { features } from '../../lib/config/features';
import {
  renderStrukText, cetakStruk, connectPrinter, getPairedDevices, printerTersedia,
  hitungStrukFont,
} from '../../lib/printer/struk';
import { formatRupiah } from '../../lib/utils/currency';
import { formatTanggalJam } from '../../lib/utils/date';
import BottomSheet from '../../components/ui/bottom-sheet';
import EmptyState from '../../components/shared/empty-state';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer', debit: 'Debit',
};

// Padding yang dikurangi dari window.width untuk mendapat availableWidth struk:
//   detailBody paddingHorizontal: Spacing.lg (16) × 2 = 32
//   kertas padding: Spacing.md (12) × 2 = 24
//   total = 56px
const STRUK_PADDING = Spacing.lg * 2 + Spacing.md * 2;

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function RiwayatScreen() {
  const { width: windowWidth } = useWindowDimensions();

  const [riwayat, setRiwayat] = useState<Transaksi[]>([]);
  const [config, setConfig] = useState<UmkmConfig | null>(null);
  const [detail, setDetail] = useState<Transaksi | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);
  const [mencetak, setMencetak] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);

  // Refund sebagai tukar-isi di sheet detail (bukan sheet terpisah).
  const [refundMode, setRefundMode] = useState(false);
  const [refundAlasan, setRefundAlasan] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const detailVisible = !!detail;

  const muat = useCallback(async () => {
    const [r, c] = await Promise.all([getRiwayat(200), getConfig()]);
    setRiwayat(r);
    setConfig(c);
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const bukaDetail = async (trx: Transaksi) => {
    const items = await getItemsByTransaksi(trx.id);
    setDetailItems(items);
    setRefundMode(false);
    setRefundAlasan('');
    setDetail(trx);
  };

  const tutupDetail = () => {
    setDetail(null);
    setDetailItems([]);
    setRefundMode(false);
    setRefundAlasan('');
  };

  const cetakUlang = async () => {
    if (!config || !detail) return;
    if (!printerTersedia()) {
      Alert.alert('Printer tidak tersedia', 'Cetak struk hanya berjalan di build Android dengan printer bluetooth.');
      return;
    }
    setMencetak(true);
    try {
      const devices = await getPairedDevices();
      if (devices.length === 0) {
        Alert.alert('Printer tidak ditemukan', 'Pair printer thermal di Bluetooth HP terlebih dahulu.');
        return;
      }
      const ok = await connectPrinter(devices[0].address);
      if (!ok) { Alert.alert('Gagal terhubung', 'Periksa Bluetooth dan coba lagi.'); return; }
      const res = await cetakStruk(config, detail, detailItems);
      if (!res.ok) Alert.alert('Gagal cetak', res.pesan);
    } finally {
      setMencetak(false);
    }
  };

  const handleVoid = () => {
    if (!detail || detail.status !== 'completed') return;
    const target = detail;
    Alert.alert(
      'Void transaksi?',
      `Order ${target.nomor_order} akan ditandai VOID dan tidak masuk rekap omzet.\n\nTindakan ini tidak bisa dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Void', style: 'destructive',
          onPress: async () => {
            setVoidLoading(true);
            try {
              await voidTransaksi(target.id);
              tutupDetail();
              await muat();
            } catch {
              Alert.alert('Gagal', 'Tidak bisa void transaksi. Coba lagi.');
            } finally {
              setVoidLoading(false);
            }
          },
        },
      ]
    );
  };

  const submitRefund = async () => {
    if (!detail) return;
    const alasan = refundAlasan.trim();
    if (!alasan) { Alert.alert('Alasan wajib', 'Isi alasan refund terlebih dahulu.'); return; }
    setRefundLoading(true);
    try {
      await refundTransaksi(detail.id, alasan);
      tutupDetail();
      await muat();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa memproses refund. Coba lagi.');
    } finally {
      setRefundLoading(false);
    }
  };

  const teksStruk = config && detail ? renderStrukText(config, detail, detailItems) : '';

  // Hitung font metrics secara dinamis berdasarkan paper_width & layar.
  const availableWidth = windowWidth - STRUK_PADDING;
  const fontMetrics = hitungStrukFont(config?.paper_width ?? 58, availableWidth);

  const labelStatus = (s: Transaksi['status']) =>
    s === 'void' ? 'VOID' : s === 'refund' ? 'REFUND' : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat</Text>
        <Text style={styles.sub}>{riwayat.length} transaksi tercatat</Text>
      </View>

      <FlatList
        data={riwayat}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const batal = item.status !== 'completed';
          return (
            <Pressable
              style={[styles.row, batal && styles.rowVoid]}
              onPress={() => bukaDetail(item)}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.orderBadge, batal && styles.orderBadgeVoid]}>
                  <Text style={[styles.orderNo, batal && styles.orderNoVoid]}>
                    {item.nomor_order.split('-')[1] ?? item.nomor_order}
                  </Text>
                </View>
                <View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.rowTotal, batal && styles.rowTotalVoid]}>
                      {formatRupiah(item.grand_total)}
                    </Text>
                    {batal && (
                      <View style={[styles.voidBadge, item.status === 'refund' && styles.refundBadge]}>
                        <Text style={[styles.voidBadgeTeks, item.status === 'refund' && styles.refundBadgeTeks]}>
                          {labelStatus(item.status)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowMeta}>
                    {formatTanggalJam(item.created_at)}
                    {' · '}
                    {PAYMENT_LABEL[item.payment_method] ?? item.payment_method}
                    {item.diskon_persen > 0 ? ` · Diskon ${item.diskon_persen}%` : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🧾"
            judul="Belum ada transaksi"
            deskripsi="Transaksi yang Anda simpan di kasir akan muncul di sini."
          />
        }
      />

      {/* Detail + Refund (tukar-isi dalam satu sheet) */}
      <BottomSheet
        visible={detailVisible}
        onClose={tutupDetail}
        title={refundMode ? 'Refund Transaksi' : detail?.nomor_order}
        headerRight={
          refundMode ? (
            <Pressable onPress={() => setRefundMode(false)} hitSlop={8}>
              <Text style={styles.kembaliLink}>‹ Detail</Text>
            </Pressable>
          ) : detail && detail.status !== 'completed' ? (
            <View style={[styles.voidBadge, detail.status === 'refund' && styles.refundBadge]}>
              <Text style={[styles.voidBadgeTeks, detail.status === 'refund' && styles.refundBadgeTeks]}>
                {labelStatus(detail.status)}
              </Text>
            </View>
          ) : undefined
        }
      >
        {refundMode ? (
          /* ── MODE refund ── */
          <View style={styles.refundBody}>
            <Text style={styles.formSub}>
              {detail?.nomor_order} · {detail && formatRupiah(detail.grand_total)}
            </Text>
            <Text style={styles.formLabel}>Alasan refund *</Text>
            <TextInput
              style={styles.formInput}
              value={refundAlasan}
              onChangeText={setRefundAlasan}
              placeholder="cth: Pesanan salah, pelanggan komplain"
              placeholderTextColor={Colors.textSubtle}
              multiline
              autoFocus
            />
            <View style={styles.formAksi}>
              <Pressable style={styles.formBatal} onPress={() => setRefundMode(false)}>
                <Text style={styles.formBatalTxt}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.formConfirm, refundLoading && { opacity: 0.6 }]}
                onPress={submitRefund}
                disabled={refundLoading}
              >
                <Text style={styles.formConfirmTxt}>
                  {refundLoading ? 'Memproses…' : 'Proses Refund'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── MODE detail ── */
          <View style={styles.detailBody}>
            {/* Header info transaksi */}
            <View style={styles.detailHead}>
              <Text style={styles.detailWaktu}>
                {detail && formatTanggalJam(detail.created_at)}
              </Text>
              <Text style={[
                styles.detailGrandTotal,
                detail?.status !== 'completed' && styles.detailGrandTotalVoid,
              ]}>
                {detail && formatRupiah(detail.grand_total)}
              </Text>
            </View>

            {/* Info void/refund jika ada */}
            {detail && detail.status !== 'completed' && detail.void_reason && (
              <View style={[styles.voidInfo, detail.status === 'refund' && styles.refundInfo]}>
                <Text style={[styles.voidInfoTeks, detail.status === 'refund' && styles.refundInfoTeks]}>
                  Alasan {detail.status === 'refund' ? 'refund' : 'void'}: {detail.void_reason}
                </Text>
              </View>
            )}

            {/* Struk — scrollable, dinamis font, kertas putih tanpa fixed width */}
            <ScrollView
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
            </ScrollView>

            {/* Tombol aksi — semua height: 52 */}
            <View style={styles.aksiRow}>
              {detail?.status === 'completed' && (
                <Pressable
                  style={[styles.aksiBtn, styles.aksiVoid]}
                  onPress={handleVoid}
                  disabled={voidLoading}
                >
                  <Text style={styles.aksiVoidTxt}>{voidLoading ? '…' : 'Void'}</Text>
                </Pressable>
              )}
              {features.refund && detail?.status === 'completed' && (
                <Pressable
                  style={[styles.aksiBtn, styles.aksiRefund]}
                  onPress={() => { setRefundAlasan(''); setRefundMode(true); }}
                >
                  <Text style={styles.aksiRefundTxt}>Refund</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.aksiBtn, styles.aksiCetak, mencetak && { opacity: 0.6 }]}
                onPress={cetakUlang}
                disabled={mencetak}
              >
                <Text style={styles.aksiCetakTxt}>{mencetak ? 'Mencetak…' : '🖨  Cetak'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  kembaliLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  rowVoid: { opacity: 0.55 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  orderBadge: {
    backgroundColor: Colors.primarySoft, borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, minWidth: 48, alignItems: 'center',
  },
  orderBadgeVoid: { backgroundColor: Colors.surfaceAlt },
  orderNo: { color: Colors.primaryDark, fontWeight: '800', fontSize: FontSize.sm },
  orderNoVoid: { color: Colors.textMuted },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowTotal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  rowTotalVoid: { textDecorationLine: 'line-through', color: Colors.textMuted },
  voidBadge: {
    backgroundColor: Colors.dangerSoft, borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  voidBadgeTeks: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: '800' },
  refundBadge: { backgroundColor: Colors.warningSoft },
  refundBadgeTeks: { color: Colors.warning },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // ── Detail mode ──
  detailBody: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  detailHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailWaktu: { fontSize: FontSize.sm, color: Colors.textMuted },
  detailGrandTotal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  detailGrandTotalVoid: { textDecorationLine: 'line-through', color: Colors.textMuted },
  voidInfo: {
    backgroundColor: Colors.dangerSoft, borderRadius: Radii.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  voidInfoTeks: { color: Colors.danger, fontSize: FontSize.sm },
  refundInfo: { backgroundColor: Colors.warningSoft },
  refundInfoTeks: { color: Colors.warning },

  // Struk: ScrollView mengisi ruang antara detailHead dan aksiRow.
  // kertas (View putih) di-align center agar struk sempit (58mm) terlihat rapi.
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
    // Tidak ada fixed width — kertas auto-size ke konten terpanjang.
    // Text sudah left-align secara default; jangan ubah textAlign di strukText.
    ...shadow(1),
  },
  strukText: {
    color: Colors.text,
    // fontFamily, fontSize, lineHeight di-inject inline (dynamic).
  },

  // Tombol aksi — height: 52 untuk semua agar seragam dengan drawer lain.
  aksiRow: { flexDirection: 'row', gap: Spacing.sm },
  aksiBtn: {
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiVoid: { backgroundColor: Colors.dangerSoft, paddingHorizontal: Spacing.lg },
  aksiVoidTxt: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.md },
  aksiRefund: { backgroundColor: Colors.warningSoft, paddingHorizontal: Spacing.lg },
  aksiRefundTxt: { color: Colors.warning, fontWeight: '700', fontSize: FontSize.md },
  aksiCetak: { flex: 1, backgroundColor: Colors.primary },
  aksiCetakTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },

  // ── Refund mode ──
  refundBody: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.xl },
  formSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  formLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  formInput: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
    minHeight: 64, textAlignVertical: 'top',
  },
  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  formBatal: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBatalTxt: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  formConfirm: {
    flex: 1,
    height: 52,
    backgroundColor: Colors.warning,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formConfirmTxt: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },
});