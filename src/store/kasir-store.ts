/**
 * kasir-store.ts — Zustand global store untuk state kasir.
 *
 * Menggantikan use-kasir.ts (local hook) agar state cart tetap hidup
 * saat navigasi antara (tabs)/kasir ↔ kasir/keranjang ↔ kasir/struk.
 *
 * Semua logic dari use-kasir.ts dipindah ke sini:
 *   - cart state (cartRaw, diskonPresetId, diskonPersen)
 *   - data state (menu, kategori, presets, promoRules, config)
 *   - computed (cart, menuTampil, qtyMap, grandTotal, totalQty)
 *   - actions (tambah, kurang, ubahQty, kosongkan, bayar, muat)
 */
import { create } from 'zustand';
import { Alert } from 'react-native';
import type {
  MenuItem,
  CartItem,
  UmkmConfig,
  Transaksi,
  TransactionItem,
  DiskonPreset,
  PromoRule,
  PaymentMethod,
  Kategori,
} from '../lib/db/database';
import { getMenuTersedia, getKategori } from '../lib/db/menu';
import { getDiskonPreset } from '../lib/db/diskon-preset';
import {
  simpanTransaksi,
  getItemsByTransaksi,
  getTransaksiById,
} from '../lib/db/transaksi';
import { getConfig } from '../lib/db/pengaturan';
import { getPromoAktif } from '../lib/db/promo-rule';
import { applyPromo, hitungGrandTotal } from '../lib/cart/promo-engine';
import { features } from '../lib/config/features';

// ── Tipe State ────────────────────────────────────────────────────────────────

export interface KasirState {
  // Data dari DB
  menu: MenuItem[];
  kategori: Kategori[];
  presets: DiskonPreset[];
  promoRules: PromoRule[];
  config: UmkmConfig | null;

  // Cart state
  cartRaw: CartItem[];
  diskonPresetId: number | null;
  diskonPersen: number;
  kategoriAktif: number | null;

  // Computed (derived, di-update setiap mutasi cart)
  cart: CartItem[];
  menuTampil: MenuItem[];
  qtyMap: Record<number, number>;
  grandTotal: number;
  totalQty: number;

  // Hasil transaksi terakhir (untuk StrukPreview)
  trxSelesai: Transaksi | null;
  itemsSelesai: TransactionItem[];
  strukVisible: boolean;

  // Loading
  sedangMuat: boolean;
}

export interface KasirActions {
  muat: () => Promise<void>;
  setKategoriAktif: (id: number | null) => void;
  tambah: (item: MenuItem) => void;
  kurang: (item: MenuItem) => void;
  ubahQty: (menuItemId: number | null, nama: string, delta: number) => void;
  kosongkan: () => void;
  handleDiskonChange: (presetId: number | null, persen: number) => void;
  bayar: (
    paymentMethod: PaymentMethod,
    uangDiterima: number | null,
  ) => Promise<void>;
  tutupStruk: () => void;
}

// ── Helper computed ───────────────────────────────────────────────────────────

function hitungComputed(
  cartRaw: CartItem[],
  promoRules: PromoRule[],
  diskonPersen: number,
  menu: MenuItem[],
  kategoriAktif: number | null,
) {
  const cart = features.promoEngine
    ? applyPromo(cartRaw, promoRules)
    : cartRaw;

  const menuTampil =
    kategoriAktif === null
      ? menu
      : menu.filter((m) => m.kategori_id === kategoriAktif);

  const qtyMap: Record<number, number> = {};
  cartRaw.forEach((c) => {
    if (c.menu_item_id != null) qtyMap[c.menu_item_id] = c.qty;
  });

  const grandTotal = hitungGrandTotal(cart, diskonPersen).grandTotal;
  const totalQty = cartRaw.reduce((s, c) => s + c.qty, 0);

  return { cart, menuTampil, qtyMap, grandTotal, totalQty };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useKasirStore = create<KasirState & KasirActions>((set, get) => ({
  // Initial state
  menu: [],
  kategori: [],
  presets: [],
  promoRules: [],
  config: null,
  cartRaw: [],
  diskonPresetId: null,
  diskonPersen: 0,
  kategoriAktif: null,
  cart: [],
  menuTampil: [],
  qtyMap: {},
  grandTotal: 0,
  totalQty: 0,
  trxSelesai: null,
  itemsSelesai: [],
  strukVisible: false,
  sedangMuat: false,

  // ── Actions ──────────────────────────────────────────────────────────────

  muat: async () => {
    set({ sedangMuat: true });
    try {
      const [m, k, c, p, promo] = await Promise.all([
        getMenuTersedia(),
        getKategori(),
        getConfig(),
        getDiskonPreset(),
        features.promoEngine
          ? getPromoAktif()
          : Promise.resolve([] as PromoRule[]),
      ]);
      const { cartRaw, diskonPersen, kategoriAktif } = get();
      const computed = hitungComputed(cartRaw, promo, diskonPersen, m, kategoriAktif);
      set({
        menu: m,
        kategori: k,
        config: c,
        presets: p,
        promoRules: promo,
        menuTampil: computed.menuTampil,
        sedangMuat: false,
      });
    } catch {
      set({ sedangMuat: false });
    }
  },

  setKategoriAktif: (id) => {
    const { menu, cartRaw, promoRules, diskonPersen } = get();
    const computed = hitungComputed(cartRaw, promoRules, diskonPersen, menu, id);
    set({ kategoriAktif: id, menuTampil: computed.menuTampil });
  },

  tambah: (item) => {
    const { cartRaw, promoRules, diskonPersen, menu, kategoriAktif } = get();
    const idx = cartRaw.findIndex((c) => c.menu_item_id === item.id);
    let next: CartItem[];
    if (idx >= 0) {
      next = cartRaw.map((c, i) =>
        i === idx ? { ...c, qty: c.qty + 1 } : c,
      );
    } else {
      next = [
        ...cartRaw,
        {
          menu_item_id: item.id,
          nama_produk: item.nama,
          harga_satuan: item.harga,
          qty: 1,
          diskon_preset_id: null,
          diskon_persen: 0,
        },
      ];
    }
    const computed = hitungComputed(next, promoRules, diskonPersen, menu, kategoriAktif);
    set({ cartRaw: next, ...computed });
  },

  ubahQty: (menuItemId, nama, delta) => {
    const { cartRaw, promoRules, diskonPersen, menu, kategoriAktif } = get();
    const next = cartRaw
      .map((c) => {
        const cocok = c.menu_item_id === menuItemId && c.nama_produk === nama;
        return cocok ? { ...c, qty: c.qty + delta } : c;
      })
      .filter((c) => c.qty > 0);
    const computed = hitungComputed(next, promoRules, diskonPersen, menu, kategoriAktif);
    set({ cartRaw: next, ...computed });
  },

  kurang: (item) => {
    get().ubahQty(item.id, item.nama, -1);
  },

  kosongkan: () => {
    const { menu, promoRules, kategoriAktif } = get();
    const computed = hitungComputed([], promoRules, 0, menu, kategoriAktif);
    set({
      cartRaw: [],
      diskonPresetId: null,
      diskonPersen: 0,
      ...computed,
    });
  },

  handleDiskonChange: (presetId, persen) => {
    const { cartRaw, promoRules, menu, kategoriAktif } = get();
    const computed = hitungComputed(cartRaw, promoRules, persen, menu, kategoriAktif);
    set({ diskonPresetId: presetId, diskonPersen: persen, ...computed });
  },

  bayar: async (paymentMethod, uangDiterima) => {
    const { cartRaw, cart, diskonPresetId, diskonPersen, menu, promoRules, kategoriAktif } = get();
    if (cartRaw.length === 0) return;
    try {
      const hasil = await simpanTransaksi({
        items: cart,
        diskonPresetId,
        diskonPersen,
        paymentMethod,
        uangDiterima,
      });
      const [trx, items] = await Promise.all([
        getTransaksiById(hasil.transaksiId),
        getItemsByTransaksi(hasil.transaksiId),
      ]);

      // Reset cart
      const computed = hitungComputed([], promoRules, 0, menu, kategoriAktif);
      set({
        trxSelesai: trx,
        itemsSelesai: items,
        strukVisible: true,
        cartRaw: [],
        diskonPresetId: null,
        diskonPersen: 0,
        ...computed,
      });
    } catch {
      Alert.alert('Gagal', 'Transaksi gagal disimpan. Coba lagi.');
    }
  },

  tutupStruk: () => {
    set({ strukVisible: false, trxSelesai: null, itemsSelesai: [] });
  },
}));
