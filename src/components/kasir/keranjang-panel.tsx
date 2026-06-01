/**
 * KeranjangPanel — drawer keranjang belanja.
 *
 * @expo/ui (sheet native): SATU <BottomSheet>. Picker diskon = TUKAR-ISI.
 *
 * PERUBAHAN (QRIS local-first):
 *   - Prop `qrisReady`: bila false, metode QRIS dinonaktifkan + tampil catatan
 *     "atur di Pengaturan". Metode tunai/transfer/debit tidak terpengaruh.
 *   - Saat metode QRIS dipilih: tidak ada input uang; tombol jadi
 *     "Tampilkan QR · Rp…". Pembayaran QR ditangani layar kasir (DialogQris).
 *   - Logika BOGO/diskon/kembalian cash TIDAK berubah.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import BottomSheet from '../ui/bottom-sheet';
import type { IconName } from '../ui/icon';
import Icon from '../ui/icon';
import PickerRow from '../ui/picker-row';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah, formatAngka, parseRupiah } from '../../lib/utils/currency';
import type { CartItem, DiskonPreset, PaymentMethod } from '../../lib/db/database';
import { hitungGrandTotal } from '../../lib/cart/promo-engine';
import { features } from '../../lib/config/features';
import DiskonInput from './diskon-input';

interface Props {
  visible: boolean;
  cart: CartItem[];
  cartRaw: CartItem[];
  presets: DiskonPreset[];
  diskonPresetId: number | null;
  diskonPersen: number;
  /** Apakah QRIS siap (PG aktif + secret ada). Default false. */
  qrisReady?: boolean;
  onTutup: () => void;
  onUbahQty: (menuItemId: number | null, nama: string, delta: number) => void;
  onUbahDiskon: (presetId: number | null, persen: number) => void;
  onBayar: (paymentMethod: PaymentMethod, uangDiterima: number | null) => void;
  /** @deprecated tidak lagi dirender. */
  onKosongkan?: () => void;
}

const PAYMENT_META: Record<PaymentMethod, { icon: IconName; label: string }> = {
  tunai: { icon: 'banknote', label: 'Tunai' },
  qris: { icon: 'smartphone', label: 'QRIS' },
  transfer: { icon: 'landmark', label: 'Transfer' },
  debit: { icon: 'credit-card', label: 'Debit' },
};

export default function KeranjangPanel(props: Props) {
  const {
    visible, cart, cartRaw, presets, diskonPresetId, diskonPersen, qrisReady = false,
    onTutup, onUbahQty, onUbahDiskon, onBayar,
  } = props;

  const showPayment = features.payment;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [uangStr, setUangStr] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setUangStr('');
      setPaymentMethod('tunai');
      setPickerOpen(false);
    }
  }, [visible]);

  const handleTutup = () => {
    setUangStr('');
    setPaymentMethod('tunai');
    setPickerOpen(false);
    onTutup();
  };

  const pilihDiskon = (presetId: number | null, persen: number) => {
    onUbahDiskon(presetId, persen);
    setPickerOpen(false);
  };

  const { subtotal: subtotalPaid, diskonNominal: diskonHeader, grandTotal } =
    hitungGrandTotal(cart, diskonPersen);
  const itemsGratis = cart.filter((c) => c.item_type === 'promo_free');
  const bogoValue = itemsGratis.reduce((s, c) => s + c.harga_satuan * c.qty, 0);
  const subtotalRaw = subtotalPaid + bogoValue;

  const isCash = showPayment && paymentMethod === 'tunai';
  const isQris = showPayment && paymentMethod === 'qris';
  const uangNum = parseRupiah(uangStr);
  const kembalian = isCash && uangNum >= grandTotal ? uangNum - grandTotal : null;

  const canBayar =
    cartRaw.length > 0 && grandTotal > 0 &&
    (!isCash || uangNum >= grandTotal) &&
    (!isQris || qrisReady);

  function handleBayar() {
    if (showPayment) onBayar(paymentMethod, isCash ? uangNum : null);
    else onBayar('tunai', null);
    setUangStr('');
    setPaymentMethod('tunai');
  }

  const labelTombol = isQris
    ? `Tampilkan QR · ${formatRupiah(grandTotal)}`
    : isCash
      ? `Bayar · ${formatRupiah(grandTotal)}`
      : `Konfirmasi Bayar · ${formatRupiah(grandTotal)}`;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleTutup}
      title={pickerOpen ? 'Pilih Diskon' : 'Keranjang'}
    >
      <View style={styles.container}>
        {pickerOpen ? (
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.pickerListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <PickerRow
                label="Tanpa Diskon"
                active={diskonPresetId === null}
                onPress={() => pilihDiskon(null, 0)}
              />
              {presets.map((p) => (
                <PickerRow
                  key={p.id}
                  label={p.nama}
                  badge={`${p.persen}%`}
                  active={diskonPresetId === p.id}
                  onPress={() => pilihDiskon(p.id, p.persen)}
                />
              ))}
              {presets.length === 0 && (
                <Text style={styles.pickerKosong}>
                  Belum ada preset diskon. Tambahkan dulu di Pengaturan → Preset Diskon.
                </Text>
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {cartRaw.map((it) => {
                const sub = it.harga_satuan * it.qty;
                const key = `${it.menu_item_id ?? ''}_${it.nama_produk}`;
                return (
                  <View key={key} style={styles.item}>
                    <View style={styles.itemKiri}>
                      <Text style={styles.itemNama} numberOfLines={1}>{it.nama_produk}</Text>
                      <Text style={styles.itemHarga}>
                        {formatRupiah(it.harga_satuan)} × {it.qty} = {formatRupiah(sub)}
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => onUbahQty(it.menu_item_id, it.nama_produk, -1)}
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepPressed]}
                      >
                        <Icon name="minus" size={18} color={Colors.text} strokeWidth={2.6} />
                      </Pressable>
                      <Text style={styles.qty}>{it.qty}</Text>
                      <Pressable
                        onPress={() => onUbahQty(it.menu_item_id, it.nama_produk, +1)}
                        style={({ pressed }) => [styles.stepBtn, styles.stepPlus, pressed && styles.stepPressed]}
                      >
                        <Icon name="plus" size={18} color={Colors.onPrimary} strokeWidth={2.6} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {itemsGratis.length > 0 && (
                <View style={styles.promoBox}>
                  <View style={styles.promoTitleRow}>
                    <Icon name="gift" size={16} color={Colors.success} />
                    <Text style={styles.promoTitle}>Promo BOGO</Text>
                  </View>
                  {itemsGratis.map((g, i) => (
                    <Text key={i} style={styles.promoLine}>{g.nama_produk} × {g.qty} — GRATIS</Text>
                  ))}
                </View>
              )}

              <View style={styles.diskonBox}>
                <DiskonInput
                  presets={presets}
                  selectedId={diskonPresetId}
                  selectedPersen={diskonPersen}
                  onPress={() => setPickerOpen(true)}
                />
              </View>

              {showPayment && (
                <>
                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentLabel}>Metode Bayar</Text>
                    <View style={styles.paymentRow}>
                      {(['tunai', 'qris', 'transfer', 'debit'] as PaymentMethod[]).map((m) => {
                        const aktif = paymentMethod === m;
                        const qrisDisabled = m === 'qris' && !qrisReady;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => {
                              if (qrisDisabled) return;
                              setPaymentMethod(m);
                              setUangStr('');
                            }}
                            style={[
                              styles.paymentBtn,
                              aktif && styles.paymentBtnAktif,
                              qrisDisabled && styles.paymentBtnOff,
                            ]}
                          >
                            <Icon
                              name={PAYMENT_META[m].icon}
                              size={20}
                              color={qrisDisabled ? Colors.textSubtle : aktif ? Colors.primary : Colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.paymentTeks,
                                aktif && styles.paymentTeksAktif,
                                qrisDisabled && styles.paymentTeksOff,
                              ]}
                            >
                              {PAYMENT_META[m].label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!qrisReady && (
                      <Text style={styles.qrisNote}>
                        QRIS belum aktif. Atur penyedia di Pengaturan → Pembayaran QRIS.
                      </Text>
                    )}
                  </View>

                  {isCash && (
                    <View style={styles.cashSection}>
                      <Text style={styles.paymentLabel}>Uang Diterima</Text>
                      <View style={styles.uangWrap}>
                        <Text style={styles.rpPrefix}>Rp</Text>
                        <TextInput
                          style={styles.uangInput}
                          value={uangStr}
                          onChangeText={(t) => {
                            const n = parseRupiah(t);
                            setUangStr(n > 0 ? formatAngka(n) : '');
                          }}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.textSubtle}
                        />
                      </View>
                      {uangNum > 0 && uangNum < grandTotal && (
                        <Text style={styles.kurang}>Kurang {formatRupiah(grandTotal - uangNum)}</Text>
                      )}
                      {kembalian !== null && (
                        <View style={styles.kembalianBox}>
                          <Text style={styles.kembalianLabel}>Kembalian</Text>
                          <Text style={styles.kembalianNilai}>{formatRupiah(kembalian)}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {isQris && (
                    <View style={styles.qrisInfo}>
                      <Text style={styles.qrisInfoTeks}>
                        QR akan dibuat sesuai total. Pelanggan scan, lalu aplikasi mendeteksi
                        pembayaran otomatis.
                      </Text>
                    </View>
                  )}

                  {!isCash && !isQris && (
                    <View style={styles.qrisInfo}>
                      <Text style={styles.qrisInfoTeks}>
                        Konfirmasi setelah dana {PAYMENT_META[paymentMethod].label.toLowerCase()} masuk / disetujui.
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={{ height: Spacing.lg }} />
            </ScrollView>

            <View style={styles.ringkasan}>
              <View style={styles.barisTotal}>
                <Text style={styles.subLabel}>Subtotal</Text>
                <Text style={styles.subNilai}>{formatRupiah(subtotalRaw)}</Text>
              </View>
              {bogoValue > 0 && (
                <View style={styles.barisTotal}>
                  <Text style={styles.subLabel}>Diskon BOGO</Text>
                  <Text style={styles.diskonNilai}>−{formatRupiah(bogoValue)}</Text>
                </View>
              )}
              {diskonHeader > 0 && (
                <View style={styles.barisTotal}>
                  <Text style={styles.subLabel}>Diskon {diskonPersen}%</Text>
                  <Text style={styles.diskonNilai}>−{formatRupiah(diskonHeader)}</Text>
                </View>
              )}
              <View style={[styles.barisTotal, styles.barisGrand]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandNilai}>{formatRupiah(grandTotal)}</Text>
              </View>

              <Pressable
                onPress={handleBayar}
                disabled={!canBayar}
                style={({ pressed }) => [
                  styles.btnBayar,
                  !canBayar && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnBayarTeks}>{labelTombol}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  itemKiri: { flex: 1 },
  itemNama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  itemHarga: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: {
    width: 34, height: 34, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  stepPressed: { opacity: 0.7 },
  qty: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, minWidth: 22, textAlign: 'center' },

  promoBox: {
    marginTop: Spacing.md, backgroundColor: Colors.successSoft,
    borderRadius: Radii.md, padding: Spacing.md, gap: 2,
  },
  promoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  promoTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.success },
  promoLine: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },

  diskonBox: { marginTop: Spacing.lg },

  paymentSection: { marginTop: Spacing.lg },
  paymentLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  paymentBtn: {
    flexBasis: '47%', flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radii.lg,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  paymentBtnAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  paymentBtnOff: { opacity: 0.45 },
  paymentTeks: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textMuted },
  paymentTeksAktif: { color: Colors.primary },
  paymentTeksOff: { color: Colors.textSubtle },
  qrisNote: { fontSize: FontSize.xs, color: Colors.warning, marginTop: Spacing.sm, fontWeight: '600' },

  cashSection: { marginTop: Spacing.lg },
  uangWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg,
  },
  rpPrefix: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '700', marginRight: Spacing.sm },
  uangInput: {
    flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.xl,
    fontWeight: '700', color: Colors.text, textAlign: 'right',
  },
  kurang: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.sm, fontWeight: '600' },
  kembalianBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.md, backgroundColor: Colors.successSoft,
    borderRadius: Radii.md, padding: Spacing.md,
  },
  kembalianLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  kembalianNilai: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.success },
  qrisInfo: {
    marginTop: Spacing.md, backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md, padding: Spacing.md,
  },
  qrisInfoTeks: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20 },

  ringkasan: {
    backgroundColor: 'transparent', paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  barisTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  subLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  subNilai: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
  diskonNilai: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '700' },
  barisGrand: {
    marginTop: Spacing.xs, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: Spacing.md,
  },
  grandLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  grandNilai: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },

  btnBayar: {
    height: 52,
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(2),
  },
  btnDisabled: { backgroundColor: Colors.borderStrong },
  btnPressed: { opacity: 0.9 },
  btnBayarTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },

  pickerListContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  pickerKosong: {
    color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center',
    paddingVertical: Spacing.xl, lineHeight: 20,
  },
});
