/**
 * promo-engine.ts — logika promo BOGO / Buy2Get1 + hitung total.
 *
 * applyPromo(cartRaw, rules):
 *   Mengembalikan cart baru yang menambahkan baris GRATIS (item_type
 *   'promo_free') untuk setiap promo aktif yang cocok. Item gratis TIDAK
 *   menambah subtotal yang dibayar (harga efektif 0 saat dihitung), tapi tetap
 *   tampil agar kasir & pelanggan melihat barang yang digratiskan.
 *
 *   - BOGO     : tiap kelipatan 2 qty → 1 gratis (beli 1 gratis 1).
 *   - Buy2Get1 : tiap kelipatan 3 qty → 1 gratis (beli 2 gratis 1).
 *
 * hitungGrandTotal(cart, diskonPersen):
 *   subtotal      = jumlah harga item BERBAYAR (item_type !== 'promo_free')
 *   diskonNominal = subtotal * diskonPersen / 100  (dibulatkan)
 *   grandTotal    = subtotal - diskonNominal
 */

import type { CartItem, PromoRule } from '../db/database';

function qtyGratis(tipe: PromoRule['tipe_promo'], qty: number): number {
  if (qty <= 0) return 0;
  if (tipe === 'bogo') return Math.floor(qty / 2);
  if (tipe === 'buy2get1') return Math.floor(qty / 3);
  return 0;
}

/**
 * Terapkan promo aktif ke cart. cartRaw hanya berisi item 'normal'
 * (atau tanpa item_type). Hasil = cartRaw + baris promo_free.
 */
export function applyPromo(cartRaw: CartItem[], rules: PromoRule[]): CartItem[] {
  const base = cartRaw.map((c) => ({ ...c, item_type: c.item_type ?? 'normal' as const }));
  if (!rules || rules.length === 0) return base;

  const gratisRows: CartItem[] = [];

  for (const item of base) {
    if (item.menu_item_id == null) continue;
    const rule = rules.find((r) => r.menu_item_id === item.menu_item_id && r.is_active === 1);
    if (!rule) continue;

    const g = qtyGratis(rule.tipe_promo, item.qty);
    if (g > 0) {
      gratisRows.push({
        menu_item_id: item.menu_item_id,
        nama_produk: item.nama_produk,
        harga_satuan: item.harga_satuan,
        qty: g,
        diskon_preset_id: null,
        diskon_persen: 0,
        item_type: 'promo_free',
      });
    }
  }

  return [...base, ...gratisRows];
}

export interface TotalBreakdown {
  subtotal: number;      // hanya item berbayar
  diskonNominal: number; // dari diskon header (persen)
  grandTotal: number;
}

/** Hitung subtotal (berbayar), diskon header, dan grand total. */
export function hitungGrandTotal(cart: CartItem[], diskonPersen: number): TotalBreakdown {
  const subtotal = cart.reduce((s, c) => {
    if (c.item_type === 'promo_free') return s;
    return s + c.harga_satuan * c.qty;
  }, 0);

  const persen = Math.max(0, Math.min(diskonPersen || 0, 100));
  const diskonNominal = Math.round((subtotal * persen) / 100);
  const grandTotal = Math.max(0, subtotal - diskonNominal);

  return { subtotal, diskonNominal, grandTotal };
}
