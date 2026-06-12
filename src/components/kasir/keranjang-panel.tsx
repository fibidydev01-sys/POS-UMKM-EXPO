/**
 * keranjang-panel.tsx — drawer keranjang belanja.
 *
 * ARSITEKTUR: Sticky Header · Scrollable Body · Sticky Footer
 * ─────────────────────────────────────────────────────────────
 * BottomSheet (snapPoint 85%)
 * ├── [BottomSheet handles its own header via title prop]
 * │
 * ├── MODE: pickerOpen = true
 * │   └── BottomSheetScrollView (full flex)   ← daftar preset diskon
 * │
 * └── MODE: pickerOpen = false
 *     ├── STICKY SUB-HEADER (opsional, muncul saat cash)
 *     │   └── uangInput + kembalian + UANG CEPAT      ← selalu kelihatan
 *     │
 *     ├── SCROLLABLE BODY (flex: 1)
 *     │   ├── CartItems + stepper
 *     │   ├── Promo BOGO info
 *     │   ├── DiskonInput
 *     │   └── PaymentMethod picker (3 tombol: Tunai, Transfer, Debit)
 *     │
 *     └── STICKY FOOTER (height fixed)
 *         ├── Subtotal / Diskon / Total
 *         └── [TOMBOL BAYAR]                        ← selalu kelihatan
 *
 * Metode pembayaran: Tunai, Transfer, Debit.
 *
 * React.memo: mencegah re-render saat parent kasir.tsx update state lain.
 *
 * PERUBAHAN (FINISHING) — Audit B3:
 *   1. QUICK-FILL UANG TUNAI: komponen <UangCepat> di bawah input uang —
 *      chip "Uang Pas" + pecahan umum di atas total. Gap paling sering
 *      dirasakan kasir nyata.
 *   2. BACK BUTTON PICKER DISKON: baris "← Kembali ke Keranjang" eksplisit
 *      di atas daftar preset (sebelumnya hanya bisa pan-down, tidak jelas).
 *   3. TOMBOL − JADI 🗑 SAAT QTY = 1: diferensiasi visual bahwa tap berikut
 *      MENGHAPUS item, bukan sekadar mengurangi.
 *   4. INPUT UANG → BottomSheetTextInput: sesuai aturan bottom-sheet.tsx,
 *      TextInput RN biasa di dalam sheet native bisa bermasalah dengan
 *      keyboard — komponen re-export dari @expo/ui yang benar.
 *   5. BOGO BOX: tambah subtitle penjelas "Item gratis otomatis dari program
 *      promo aktif." (sebelumnya hanya "GRATIS" tanpa konteks).
 *   6. NOTE TRANSFER/DEBIT: dipromosikan dari teks italic kecil → info box
 *      warningSoft dengan ikon, jauh lebih terlihat.
 *   7. Shortcut "Buat Preset" bila daftar diskon kosong tidak ditambahkan di
 *      sini (navigasi keluar dari sheet ke stack pengaturan rawan konflik
 *      dengan sheet native) — teks petunjuk lokasi sudah cukup.
 */

import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '../ui/bottom-sheet';
import type { IconName } from '../ui/icon';
import Icon from '../ui/icon';
import PickerRow from '../ui/picker-row';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah, formatAngka, parseRupiah } from '../../lib/utils/currency';
import type { CartItem, DiskonPreset, PaymentMethod } from '../../lib/db/database';
import { hitungGrandTotal } from '../../lib/cart/promo-engine';
import DiskonInput from './diskon-input';
import UangCepat from './uang-cepat';

interface Props {
  visible: boolean;
  cart: CartItem[];
  cartRaw: CartItem[];
  presets: DiskonPreset[];
  diskonPresetId: number | null;
  diskonPersen: number;
  onTutup: () => void;
  onUbahQty: (menuItemId: number | null, nama: string, delta: number) => void;
  onUbahDiskon: (presetId: number | null, persen: number) => void;
  onBayar: (paymentMethod: PaymentMethod, uangDiterima: number | null) => void;
  onKosongkan?: () => void;
}

// Metode bayar: Tunai, Transfer, Debit
const PAYMENT_META: Record<PaymentMethod, { icon: IconName; label: string }> = {
  tunai:    { icon: 'banknote',    label: 'Tunai' },
  transfer: { icon: 'landmark',    label: 'Transfer' },
  debit:    { icon: 'credit-card', label: 'Debit' },
};

function KeranjangPanelInner(props: Props) {
  const {
    visible,
    cart,
    cartRaw,
    presets,
    diskonPresetId,
    diskonPersen,
    onTutup,
    onUbahQty,
    onUbahDiskon,
    onBayar,
  } = props;

  // UI-local state
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

  // ── Computed ──────────────────────────────────────────────────
  const { subtotal: subtotalPaid, diskonNominal: diskonHeader, grandTotal } =
    hitungGrandTotal(cart, diskonPersen);
  const itemsGratis = cart.filter((c) => c.item_type === 'promo_free');
  const bogoValue = itemsGratis.reduce((s, c) => s + c.harga_satuan * c.qty, 0);
  const subtotalRaw = subtotalPaid + bogoValue;

  const isCash   = paymentMethod === 'tunai';
  const uangNum  = parseRupiah(uangStr);
  const kembalian = isCash && uangNum >= grandTotal ? uangNum - grandTotal : null;
  const canBayar  = cartRaw.length > 0 && grandTotal > 0 && (!isCash || uangNum >= grandTotal);

  function handleBayar() {
    onBayar(paymentMethod, isCash ? uangNum : null);
    setUangStr('');
    setPaymentMethod('tunai');
  }

  const labelTombol = isCash
    ? `Bayar · ${formatRupiah(grandTotal)}`
    : `Konfirmasi Bayar · ${formatRupiah(grandTotal)}`;

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <BottomSheet
      visible={visible}
      onClose={handleTutup}
      title={pickerOpen ? 'Pilih Diskon' : 'Keranjang'}
      scrollable={false}
    >
      {/* ── MODE: Picker Diskon ─────────────────────────────── */}
      {pickerOpen ? (
        <BottomSheetScrollView
          style={styles.flex}
          contentContainerStyle={styles.pickerContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button eksplisit — user tahu cara kembali tanpa pan-down */}
          <Pressable
            onPress={() => setPickerOpen(false)}
            style={({ pressed }) => [styles.pickerBack, pressed && styles.pickerBackPressed]}
            hitSlop={6}
          >
            <Icon name="chevron-left" size={20} color={Colors.primary} strokeWidth={2.6} />
            <Text style={styles.pickerBackTeks}>Kembali ke Keranjang</Text>
          </Pressable>

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
              Belum ada preset diskon. Tambahkan di Pengaturan → Preset Diskon.
            </Text>
          )}
        </BottomSheetScrollView>

      ) : (
        /* ── MODE: Keranjang (sticky header · scroll body · sticky footer) */
        <View style={styles.flex}>

          {/* ── STICKY SUB-HEADER: uang tunai input + quick-fill ── */}
          {isCash && (
            <View style={styles.cashHeader}>
              <View style={styles.cashRow}>
                <Text style={styles.cashLabel}>Uang Diterima</Text>
                {kembalian !== null && (
                  <View style={styles.kembalianPill}>
                    <Text style={styles.kembalianPillTeks}>
                      Kembalian {formatRupiah(kembalian)}
                    </Text>
                  </View>
                )}
                {uangNum > 0 && uangNum < grandTotal && (
                  <Text style={styles.kurangTeks}>
                    Kurang {formatRupiah(grandTotal - uangNum)}
                  </Text>
                )}
              </View>
              <View style={styles.uangWrap}>
                <Text style={styles.rpPrefix}>Rp</Text>
                {/* BottomSheetTextInput: WAJIB di dalam sheet native (lihat
                    dokumentasi bottom-sheet.tsx) agar keyboard tidak konflik. */}
                <BottomSheetTextInput
                  style={styles.uangInput}
                  value={uangStr}
                  onChangeText={(t: string) => {
                    const n = parseRupiah(t);
                    setUangStr(n > 0 ? formatAngka(n) : '');
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textSubtle}
                />
              </View>
              {/* Quick-fill: Uang Pas + pecahan umum di atas total */}
              <UangCepat
                total={grandTotal}
                onPilih={(nominal) => setUangStr(formatAngka(nominal))}
              />
            </View>
          )}

          {/* ── SCROLLABLE BODY ─────────────────────────────── */}
          <BottomSheetScrollView
            style={styles.flex}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cart items */}
            {cartRaw.map((it) => {
              const sub = it.harga_satuan * it.qty;
              const key = `${it.menu_item_id ?? ''}_${it.nama_produk}`;
              const akanHapus = it.qty === 1; // − berikutnya = hapus item
              return (
                <View key={key} style={styles.item}>
                  <View style={styles.itemKiri}>
                    <Text style={styles.itemNama} numberOfLines={2}>
                      {it.nama_produk}
                    </Text>
                    <Text style={styles.itemHarga}>
                      {formatRupiah(it.harga_satuan)} × {it.qty} = {formatRupiah(sub)}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => onUbahQty(it.menu_item_id, it.nama_produk, -1)}
                      style={({ pressed }) => [
                        styles.stepBtn,
                        akanHapus && styles.stepHapus,
                        pressed && styles.stepPressed,
                      ]}
                    >
                      {/* qty=1 → ikon trash merah: tap berikut MENGHAPUS item */}
                      {akanHapus ? (
                        <Icon name="trash" size={17} color={Colors.danger} strokeWidth={2.4} />
                      ) : (
                        <Icon name="minus" size={18} color={Colors.text} strokeWidth={2.6} />
                      )}
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

            {/* Promo BOGO info */}
            {itemsGratis.length > 0 && (
              <View style={styles.promoBox}>
                <View style={styles.promoTitleRow}>
                  <Icon name="gift" size={16} color={Colors.success} />
                  <Text style={styles.promoTitle}>Promo BOGO</Text>
                </View>
                <Text style={styles.promoSub}>
                  Item gratis otomatis dari program promo aktif.
                </Text>
                {itemsGratis.map((g, i) => (
                  <Text key={i} style={styles.promoLine}>
                    {g.nama_produk} × {g.qty} — GRATIS
                  </Text>
                ))}
              </View>
            )}

            {/* Diskon */}
            <View style={styles.diskonBox}>
              <DiskonInput
                presets={presets}
                selectedId={diskonPresetId}
                selectedPersen={diskonPersen}
                onPress={() => setPickerOpen(true)}
              />
            </View>

            {/* Payment method picker: Tunai, Transfer, Debit */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>Metode Bayar</Text>
              <View style={styles.paymentRow}>
                {(Object.keys(PAYMENT_META) as PaymentMethod[]).map((m) => {
                  const aktif = paymentMethod === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        setPaymentMethod(m);
                        setUangStr('');
                      }}
                      style={[
                        styles.paymentBtn,
                        aktif && styles.paymentBtnAktif,
                      ]}
                    >
                      <Icon
                        name={PAYMENT_META[m].icon}
                        size={20}
                        color={aktif ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[
                        styles.paymentTeks,
                        aktif && styles.paymentTeksAktif,
                      ]}>
                        {PAYMENT_META[m].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Note non-tunai: info box jelas (bukan italic kecil) */}
              {!isCash && (
                <View style={styles.metodeNoteBox}>
                  <Icon name="warning" size={15} color={Colors.warning} strokeWidth={2.4} />
                  <Text style={styles.metodeNoteTeks}>
                    Pastikan dana {PAYMENT_META[paymentMethod].label.toLowerCase()} sudah
                    masuk SEBELUM menekan tombol konfirmasi di bawah.
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: Spacing.md }} />
          </BottomSheetScrollView>

          {/* ── STICKY FOOTER: ringkasan + tombol bayar ─────── */}
          <View style={styles.footer}>
            {/* Baris total hanya tampil kalau ada nilai */}
            <View style={styles.totalRows}>
              <View style={styles.totalBaris}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalNilai}>{formatRupiah(subtotalRaw)}</Text>
              </View>
              {bogoValue > 0 && (
                <View style={styles.totalBaris}>
                  <Text style={styles.totalLabel}>Diskon BOGO</Text>
                  <Text style={styles.diskonNilai}>−{formatRupiah(bogoValue)}</Text>
                </View>
              )}
              {diskonHeader > 0 && (
                <View style={styles.totalBaris}>
                  <Text style={styles.totalLabel}>Diskon {diskonPersen}%</Text>
                  <Text style={styles.diskonNilai}>−{formatRupiah(diskonHeader)}</Text>
                </View>
              )}
              <View style={[styles.totalBaris, styles.grandBaris]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandNilai}>{formatRupiah(grandTotal)}</Text>
              </View>
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
    </BottomSheet>
  );
}

const KeranjangPanel = memo(KeranjangPanelInner);
export default KeranjangPanel;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },

  // ── Picker mode ─────────────────────────────────────────────
  pickerContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pickerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  pickerBackPressed: { opacity: 0.7 },
  pickerBackTeks: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
  pickerKosong: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    lineHeight: 20,
  },

  // ── Sticky sub-header: cash input ────────────────────────────
  cashHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  kembalianPill: {
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  kembalianPillTeks: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.success,
  },
  kurangTeks: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '700',
  },
  uangWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  rpPrefix: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  uangInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
  },

  // ── Scrollable body ──────────────────────────────────────────
  bodyContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  itemKiri: { flex: 1 },
  itemNama: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  itemHarga: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // qty=1: border & latar merah lembut — sinyal hapus.
  stepHapus: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.danger,
  },
  stepPlus: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  stepPressed: { opacity: 0.7 },
  qty: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  promoBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 2,
  },
  promoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  promoTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.success,
  },
  promoSub: {
    fontSize: FontSize.xs,
    color: Colors.success,
    opacity: 0.85,
    marginBottom: 2,
  },
  promoLine: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  diskonBox: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  paymentSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  paymentLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  paymentBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  paymentBtnAktif: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  paymentTeks: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  paymentTeksAktif: { color: Colors.primary },
  metodeNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  metodeNoteTeks: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    lineHeight: 17,
  },

  // ── Sticky footer ────────────────────────────────────────────
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  totalRows: { gap: Spacing.xs },
  totalBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  totalNilai: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  diskonNilai: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  grandBaris: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  grandLabel: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  grandNilai: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  btnBayar: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(2),
  },
  btnDisabled: { backgroundColor: Colors.borderStrong },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  btnBayarTeks: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: FontSize.lg,
  },
});
