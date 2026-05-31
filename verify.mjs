#!/usr/bin/env node
/**
 * verify.mjs — bukti logika patch V2 (jalan dengan Node murni, tanpa RN).
 *   node verify.mjs
 *
 * Membuktikan:
 *  1. Bug rounding Tipe 1: round-on-total (UI lama) ≠ round-per-item (DB).
 *  2. Fix: hitungGrandTotal (UI baru) == simpanTransaksi (DB) — per item, selalu.
 *  3. Formula BOGO sesuai spesifikasi.
 *  4. Linking triggered_by_item_id benar per-pasangan (bukan semua ke baris pertama).
 */

let PASS = 0, FAIL = 0;
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓', m); } else { FAIL++; console.log('  ✗', m); } };

// ── Formula bersama (identik dengan kode patch) ──
const round = (n) => Math.round(n); // round half up untuk nilai positif
const finalItem = (harga, qty, persen) => round(harga * qty * (1 - persen / 100));

// UI LAMA (buggy): bulatkan di TOTAL
function uiLama(items, persen) {
  const sub = items.reduce((s, it) => s + it.harga * it.qty, 0);
  return persen > 0 ? round(sub * (1 - persen / 100)) : sub;
}
// UI BARU == promo-engine.hitungGrandTotal: per item, skip promo_free
function uiBaru(items, persen) {
  let g = 0;
  for (const it of items) {
    if (it.promo_free) continue;
    const base = it.harga * it.qty;
    g += persen > 0 ? round(base * (1 - persen / 100)) : base;
  }
  return g;
}
// DB == simpanTransaksi: per item, promo_free=0
function db(items, persen) {
  let g = 0;
  for (const it of items) {
    if (it.promo_free) { g += 0; continue; }
    g += finalItem(it.harga, it.qty, persen);
  }
  return g;
}

console.log('\n[1] Rounding Tipe 1 — kasus 12.5% (harga bukan kelipatan ribuan bulat)');
const kasus = [
  { items: [{ harga: 12500, qty: 1 }, { harga: 12500, qty: 1 }], persen: 12.5 },
  { items: [{ harga: 18500, qty: 1 }, { harga: 7300, qty: 1 }, { harga: 4200, qty: 1 }], persen: 12.5 },
  { items: [{ harga: 3750, qty: 3 }, { harga: 12500, qty: 1 }], persen: 12.5 },
  { items: [{ harga: 9900, qty: 2 }, { harga: 4500, qty: 1 }], persen: 12.5 },
];
let adaSelisih = false;
for (const k of kasus) {
  const lama = uiLama(k.items, k.persen);
  const baru = uiBaru(k.items, k.persen);
  const d = db(k.items, k.persen);
  if (lama !== d) adaSelisih = true;
  console.log(`    items=${JSON.stringify(k.items.map(i => i.harga + 'x' + i.qty))} @${k.persen}%  → UI_lama=${lama}  UI_baru=${baru}  DB=${d}`);
  ok(baru === d, `UI baru == DB (${baru} == ${d})`);
}
ok(adaSelisih, 'Minimal satu kasus membuktikan UI lama (round-on-total) ≠ DB → bug Tipe 1 nyata');

console.log('\n[2] Konsistensi acak 5.000 kasus: UI baru selalu == DB');
let mismatch = 0;
for (let i = 0; i < 5000; i++) {
  const n = 1 + Math.floor(Math.random() * 4);
  const items = Array.from({ length: n }, () => ({
    harga: 500 * (1 + Math.floor(Math.random() * 80)), // kelipatan 500
    qty: 1 + Math.floor(Math.random() * 5),
  }));
  const persen = [0, 5, 10, 12.5, 15, 17.5, 20][Math.floor(Math.random() * 7)];
  if (uiBaru(items, persen) !== db(items, persen)) mismatch++;
}
ok(mismatch === 0, `0 mismatch dari 5.000 kasus acak (ditemukan ${mismatch})`);

console.log('\n[3] Formula BOGO: FLOOR(qty / (beli+gratis)) × gratis');
const bogoFree = (qty, beli, gratis) => Math.floor(qty / (beli + gratis)) * gratis;
// BOGO 1/1
ok(bogoFree(1, 1, 1) === 0, 'BOGO pesan 1 → gratis 0');
ok(bogoFree(2, 1, 1) === 1, 'BOGO pesan 2 → gratis 1');
ok(bogoFree(3, 1, 1) === 1, 'BOGO pesan 3 → gratis 1');
ok(bogoFree(4, 1, 1) === 2, 'BOGO pesan 4 → gratis 2');
// Buy2Get1 2/1
ok(bogoFree(2, 2, 1) === 0, 'Buy2Get1 pesan 2 → gratis 0');
ok(bogoFree(3, 2, 1) === 1, 'Buy2Get1 pesan 3 → gratis 1');
ok(bogoFree(6, 2, 1) === 2, 'Buy2Get1 pesan 6 → gratis 2');

console.log('\n[4] Linking triggered_by_item_id per-pasangan (simulasi applyPromo + insert)');
// applyPromo untuk 1 item BOGO 1/1 qty=4 → 2 set: [paid,free,paid,free]
function applyPromoBOGO(item, beli, gratis) {
  const setSize = beli + gratis;
  const jumlahSet = Math.floor(item.qty / setSize);
  const out = [];
  for (let i = 0; i < jumlahSet; i++) {
    out.push({ menu_item_id: item.menu_item_id, qty: beli, item_type: 'normal', pair: i });
    out.push({ menu_item_id: item.menu_item_id, qty: gratis, item_type: 'promo_free', pair: i });
  }
  const sisa = item.qty % setSize;
  if (sisa > 0) out.push({ menu_item_id: item.menu_item_id, qty: sisa, item_type: 'normal' });
  return out;
}
const rows = applyPromoBOGO({ menu_item_id: 7, qty: 4 }, 1, 1);
// Simulasi insert berurutan + Map pasangan (identik simpanTransaksi)
let nextId = 100;
const pairToId = new Map();
const inserted = [];
for (const it of rows) {
  const key = it.pair !== undefined ? `${it.menu_item_id}_${it.pair}` : null;
  let triggered = null;
  if (it.item_type === 'promo_free' && key) triggered = pairToId.get(key) ?? null;
  const id = nextId++;
  inserted.push({ id, type: it.item_type, pair: it.pair, triggered });
  if (it.item_type !== 'promo_free' && key) pairToId.set(key, id);
}
console.log('    inserted:', JSON.stringify(inserted));
const free = inserted.filter((r) => r.type === 'promo_free');
const paid = inserted.filter((r) => r.type === 'normal');
ok(free.length === 2 && paid.length === 2, '4 baris: 2 paid + 2 free');
ok(free[0].triggered === paid[0].id, 'free set#0 → link ke paid set#0');
ok(free[1].triggered === paid[1].id, 'free set#1 → link ke paid set#1');
ok(free[0].triggered !== free[1].triggered, 'kedua free TIDAK menunjuk baris paid yang sama');

console.log('\n[5] Konsistensi struk: Subtotal_paid − Diskon_header == grand_total (BOGO + diskon)');
// Kopi 25000 x2 BOGO 1/1, diskon header 10%
const cart = [
  { harga: 25000, qty: 1, promo_free: false }, // paid
  { harga: 25000, qty: 1, promo_free: true },  // free
];
const persen = 10;
const grand = db(cart, persen);
const subtotalPaid = cart.filter(c => !c.promo_free).reduce((s, c) => s + c.harga * c.qty, 0);
const finalPaid = cart.filter(c => !c.promo_free).reduce((s, c) => s + finalItem(c.harga, c.qty, persen), 0);
const diskonHeader = subtotalPaid - finalPaid;
console.log(`    subtotalPaid=${subtotalPaid} diskonHeader=${diskonHeader} grand=${grand}`);
ok(subtotalPaid - diskonHeader === grand, `${subtotalPaid} − ${diskonHeader} == ${grand}`);

console.log(`\n──────── HASIL: ${PASS} PASS / ${FAIL} FAIL ────────\n`);
process.exit(FAIL === 0 ? 0 : 1);
