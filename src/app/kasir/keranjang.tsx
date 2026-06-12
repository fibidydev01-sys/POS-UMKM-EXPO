/**
 * kasir/keranjang.tsx — Halaman Keranjang Belanja.
 *
 * Menggantikan KeranjangPanel (drawer bottom sheet).
 * Dibuka via router.push('/kasir/keranjang') dari cart bar di kasir.tsx.
 *
 * Membaca state dari useKasirStore (Zustand) — tidak ada props, tidak ada drawer.
 * Back button header kiri → kembali ke kasir (cart tetap tersimpan di store).
 *
 * Layout:
 *   ScreenLayout (header: "Keranjang" + jumlah item)
 *   ├── Mode: KERANJANG
 *   │   ├── Sticky: uang tunai input (kalau metode tunai)
 *   │   ├── ScrollView: item list + BOGO info + diskon + metode bayar
 *   │   └── Footer sticky: subtotal/diskon/total + tombol bayar
 *   └── Mode: PICKER DISKON (replace konten, bukan navigate)
 *       └── ScrollView: list preset diskon
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah, formatAngka, parseRupiah } from '../../lib/utils/currency';
import { hitungGrandTotal } from '../../lib/cart/promo-engine';
import type { PaymentMethod } from '../../lib/db/database';
import { useKasirStore } from '../../store/kasir-store';

import Icon from '../../components/ui/icon';
import PickerRow from '../../components/ui/picker-row';
import type { IconName } from '../../components/ui/icon';

// ── Metode bayar ──────────────────────────────────────────────────────────────

const PAYMENT_META: Record<PaymentMethod, { icon: IconName; label: string }> = {
  tunai: { icon: 'banknote', label: 'Tunai' },
  transfer: { icon: 'landmark', label: 'Transfer' },
  debit: { icon: 'credit-card', label: 'Debit' },
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function KeranjangScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Zustand store
  const {
    cart,
    cartRaw,
    presets,
    diskonPresetId,
    diskonPersen,
    ubahQty,
    handleDiskonChange,
    kosongkan,
    bayar,
    strukVisible,
  } = useKasirStore();

  // Local UI state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [uangStr, setUangStr] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Setelah bayar berhasil (strukVisible jadi true) → kembali ke kasir
  useEffect(() => {
    if (strukVisible) {
      router.back();
    }
  }, [strukVisible, router]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const { subtotal: subtotalPaid, diskonNominal, grandTotal } =
    hitungGrandTotal(cart, diskonPersen);
  const itemsGratis = cart.filter((c) => c.item_type === 'promo_free');
  const bogoValue = itemsGratis.reduce((s, c) => s + c.harga_satuan * c.qty, 0);
  const subtotalRaw = subtotalPaid + bogoValue;

  const isCash = paymentMethod === 'tunai';
  const uangNum = parseRupiah(uangStr);
  const kembalian = isCash && uangNum >= grandTotal ? uangNum - grandTotal : null;
  const canBayar =
    cartRaw.length > 0 &&
    grandTotal > 0 &&
    (!isCash || uangNum >= grandTotal);

  const labelTombol = loading
    ? 'Memproses…'
    : isCash
      ? `Bayar · ${formatRupiah(grandTotal)}`
      : `Konfirmasi Bayar · ${formatRupiah(grandTotal)}`;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const pilihDiskon = (presetId: number | null, persen: number) => {
    handleDiskonChange(presetId, persen);
    setPickerOpen(false);
  };

  const handleBayar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await bayar(paymentMethod, isCash ? uangNum : null);
      // strukVisible → true → useEffect → router.back()
    } finally {
      setLoading(false);
    }
  };

  // ── Picker diskon mode ────────────────────────────────────────────────────

  if (pickerOpen) {
    return (
      <View style={styles.safe}>
        {/* Header picker */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => setPickerOpen(false)} hitSlop={12} style={styles.backBtn}>
            <Icon name="chevron-left" size={26} color={Colors.primary} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.headerTitle}>Pilih Diskon</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.pickerContent}
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
              Belum ada preset diskon. Tambahkan di Pengaturan → Preset Diskon.
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Keranjang mode ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevron-left" size={26} color={Colors.primary} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Keranjang</Text>
          <Text style={styles.headerSub}>{cartRaw.length} item</Text>
        </View>
        {cartRaw.length > 0 && (
          <Pressable onPress={kosongkan} hitSlop={8} style={styles.kosongkanBtn}>
            <Text style={styles.kosongkanTeks}>Kosongkan</Text>
          </Pressable>
        )}
      </View>

      {/* Sticky: uang tunai */}
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

          {/* Quick fill buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFillRow}
          >
            {[5000, 10000, 20000, 50000, 100000].map((nominal) => (
              <Pressable
                key={nominal}
                onPress={() => setUangStr(formatAngka(nominal))}
                style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.quickBtnTeks}>{formatRupiah(nominal)}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setUangStr(formatAngka(grandTotal))}
              style={({ pressed }) => [styles.quickBtn, styles.quickBtnExact, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.quickBtnTeks, styles.quickBtnExactTeks]}>Tepat</Text>
            </Pressable>
          </ScrollView>

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
        </View>
      )}

      {/* Scrollable body */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Item list */}
        {cartRaw.map((it) => {
          const sub = it.harga_satuan * it.qty;
          const key = `${it.menu_item_id ?? ''}_${it.nama_produk}`;
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
                  onPress={() => ubahQty(it.menu_item_id, it.nama_produk, -1)}
                  style={({ pressed }) => [
                    styles.stepBtn,
                    it.qty === 1 && styles.stepBtnHapus,
                    pressed && styles.stepPressed,
                  ]}
                  hitSlop={8}
                >
                  {it.qty === 1 ? (
                    <Icon name="trash" size={16} color={Colors.danger} strokeWidth={2.4} />
                  ) : (
                    <Icon name="minus" size={18} color={Colors.text} strokeWidth={2.6} />
                  )}
                </Pressable>
                <Text style={styles.qty}>{it.qty}</Text>
                <Pressable
                  onPress={() => ubahQty(it.menu_item_id, it.nama_produk, +1)}
                  style={({ pressed }) => [styles.stepBtn, styles.stepPlus, pressed && styles.stepPressed]}
                  hitSlop={8}
                >
                  <Icon name="plus" size={18} color={Colors.onPrimary} strokeWidth={2.6} />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* BOGO info */}
        {itemsGratis.length > 0 && (
          <View style={styles.promoBox}>
            <View style={styles.promoTitleRow}>
              <Icon name="gift" size={16} color={Colors.success} />
              <Text style={styles.promoTitle}>Promo BOGO</Text>
            </View>
            {itemsGratis.map((g, i) => (
              <Text key={i} style={styles.promoLine}>
                {g.nama_produk} × {g.qty} — GRATIS
              </Text>
            ))}
          </View>
        )}

        {/* Diskon */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.diskonBox, pressed && { opacity: 0.8 }]}
        >
          <Icon
            name="badge-percent"
            size={20}
            color={diskonPresetId !== null ? Colors.primaryDark : Colors.textMuted}
          />
          <View style={styles.flex}>
            <Text style={styles.diskonLabel}>Diskon</Text>
            <Text
              style={[
                styles.diskonNilai,
                diskonPresetId !== null && styles.diskonNilaiAktif,
              ]}
              numberOfLines={1}
            >
              {diskonPresetId !== null
                ? `${presets.find((p) => p.id === diskonPresetId)?.nama ?? 'Diskon'} · ${diskonPersen}%`
                : 'Tidak ada diskon'}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={Colors.textMuted} />
        </Pressable>

        {/* Metode bayar */}
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
                  style={[styles.paymentBtn, aktif && styles.paymentBtnAktif]}
                >
                  <Icon
                    name={PAYMENT_META[m].icon}
                    size={20}
                    color={aktif ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.paymentTeks, aktif && styles.paymentTeksAktif]}>
                    {PAYMENT_META[m].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!isCash && (
            <Text style={styles.metodeNote}>
              Konfirmasi setelah dana {PAYMENT_META[paymentMethod].label.toLowerCase()} masuk.
            </Text>
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Footer sticky */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.totalRows}>
          <View style={styles.totalBaris}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalNilai}>{formatRupiah(subtotalRaw)}</Text>
          </View>
          {bogoValue > 0 && (
            <View style={styles.totalBaris}>
              <Text style={styles.totalLabel}>Diskon BOGO</Text>
              <Text style={styles.diskonNominal}>−{formatRupiah(bogoValue)}</Text>
            </View>
          )}
          {diskonNominal > 0 && (
            <View style={styles.totalBaris}>
              <Text style={styles.totalLabel}>Diskon {diskonPersen}%</Text>
              <Text style={styles.diskonNominal}>−{formatRupiah(diskonNominal)}</Text>
            </View>
          )}
          <View style={[styles.totalBaris, styles.grandBaris]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandNilai}>{formatRupiah(grandTotal)}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => { void handleBayar(); }}
          disabled={!canBayar || loading}
          style={({ pressed }) => [
            styles.btnBayar,
            (!canBayar || loading) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnBayarTeks}>{labelTombol}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bg,
    gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 1 },
  kosongkanBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  kosongkanTeks: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '700' },

  // Cash header
  cashHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cashLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flex: 1 },
  kembalianPill: {
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  kembalianPillTeks: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.success },
  kurangTeks: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '700' },

  // Quick fill
  quickFillRow: { gap: Spacing.sm, paddingVertical: 2 },
  quickBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnTeks: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  quickBtnExact: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  quickBtnExactTeks: { color: Colors.primaryDark },

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

  // Body
  bodyContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  itemKiri: { flex: 1 },
  itemNama: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  itemHarga: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnHapus: { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger },
  stepPlus: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  stepPressed: { opacity: 0.7 },
  qty: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    minWidth: 28,
    textAlign: 'center',
  },

  // Promo BOGO
  promoBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 2,
  },
  promoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  promoTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.success },
  promoLine: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },

  // Diskon row
  diskonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  diskonLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  diskonNilai: { fontSize: FontSize.md, color: Colors.text, fontWeight: '700', marginTop: 1 },
  diskonNilaiAktif: { color: Colors.primaryDark },

  // Payment
  paymentSection: { marginTop: Spacing.lg, gap: Spacing.sm },
  paymentLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
  paymentBtnAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  paymentTeks: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  paymentTeksAktif: { color: Colors.primary },
  metodeNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
  totalLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  totalNilai: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  diskonNominal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent },
  grandBaris: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  grandLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  grandNilai: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
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

  // Picker diskon
  pickerContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pickerKosong: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    lineHeight: 20,
  },
});
