/**
 * database.ts — koneksi SQLite (expo-sqlite) + seluruh tipe domain.
 *
 * Offline-first: semua data lokal. Server hanya untuk aktivasi.
 
 * PaymentMethod: 'tunai' | 'transfer' | 'debit'.
 */

import * as SQLite from 'expo-sqlite';
import { initSchema } from './schema';

// ───────────────────────── Tipe Domain ─────────────────────────

export type PaymentMethod   = 'tunai' | 'transfer' | 'debit';
export type TipePromo       = 'bogo' | 'buy2get1';
export type StatusTransaksi = 'completed' | 'void' | 'refund';
export type CartItemType    = 'normal' | 'promo_free';
export type StockLogType    = 'in' | 'out' | 'opname';

export interface Kategori {
  id: number;
  nama: string;
  urutan: number;
}

export interface MenuItem {
  id: number;
  nama: string;
  harga: number;
  kategori_id: number | null;
  is_available: number; // 0 | 1
  created_at: string;
  stok: number;
  min_stock: number;
}

export interface StockLog {
  id: number;
  menu_item_id: number;
  type: StockLogType;
  qty: number;
  stok_sebelum: number;
  stok_sesudah: number;
  note: string | null;
  created_at: string;
}

export interface DiskonPreset {
  id: number;
  nama: string;
  persen: number;
  is_active: number; // 0 | 1
}

export interface PromoRule {
  id: number;
  menu_item_id: number;
  tipe_promo: TipePromo;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  is_active: number; // 0 | 1
  nama_produk?: string;
}

export interface CartItem {
  menu_item_id: number | null;
  nama_produk: string;
  harga_satuan: number;
  qty: number;
  diskon_preset_id: number | null;
  diskon_persen: number;
  item_type?: CartItemType;
}

export interface Transaksi {
  id: number;
  nomor_order: string;
  subtotal: number;
  diskon_preset_id: number | null;
  diskon_persen: number;
  diskon_nominal: number;
  grand_total: number;
  payment_method: PaymentMethod;
  uang_diterima: number | null;
  kembalian: number | null;
  status: StatusTransaksi;
  void_reason: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaksi_id: number;
  menu_item_id: number | null;
  nama_produk: string;
  harga_satuan: number;
  qty: number;
  subtotal: number;
  item_type: CartItemType;
}

export interface UmkmConfig {
  nama_umkm: string;
  alamat: string;
  no_telp: string;
  footer_struk: string;
  paper_width: number;       // 58 | 80
  app_version: string;
  umkm_id: string | null;
  activated: boolean;
  activation_code: string | null;

}

// ───────────────────────── Koneksi ─────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('pos_umkm.db');
  }
  return _db;
}

let _initialized = false;

export async function initDatabase(): Promise<void> {
  if (_initialized) return;
  const db = getDb();

  await initSchema(db);

  const defaults: Record<string, string> = {
    nama_umkm:       'Warung Saya',
    alamat:          '',
    no_telp:         '',
    footer_struk:    'Terima kasih atas kunjungan Anda',
    paper_width:     '58',
    app_version:     'v1.0',
    umkm_id:         '',
    activated:       '0',
    activation_code: '',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.runAsync(
      `INSERT INTO pengaturan (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO NOTHING`,
      [key, value]
    );
  }

  const cnt = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM diskon_preset`
  );
  if ((cnt?.n ?? 0) === 0) {
    await db.runAsync(
      `INSERT INTO diskon_preset (nama, persen, is_active) VALUES ('Diskon 10%', 10, 1)`
    );
    await db.runAsync(
      `INSERT INTO diskon_preset (nama, persen, is_active) VALUES ('Diskon 20%', 20, 1)`
    );
  }

  _initialized = true;
}
