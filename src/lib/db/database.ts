/**
 * database.ts — koneksi SQLite (expo-sqlite) + seluruh tipe domain.
 *
 * Offline-first: semua data tersimpan lokal di perangkat. Tidak ada server.
 * Skema dibuat sekali saat pertama dibuka (migrasi idempotent).
 */

import * as SQLite from 'expo-sqlite';

// ───────────────────────── Tipe Domain ─────────────────────────

export type PaymentMethod = 'tunai' | 'qris' | 'transfer' | 'debit';
export type TipePromo = 'bogo' | 'buy2get1';
export type StatusTransaksi = 'completed' | 'void' | 'refund';
export type CartItemType = 'normal' | 'promo_free';

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
  activated: boolean;
  activation_code: string | null;
}

// ───────────────────────── Koneksi ─────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

/** Ambil koneksi tunggal (lazy). */
export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('pos_umkm.db');
  }
  return _db;
}

let _initialized = false;

/**
 * Inisialisasi skema + seed default. Idempotent — aman dipanggil tiap start.
 */
export async function initDatabase(): Promise<void> {
  if (_initialized) return;
  const db = getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS kategori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      urutan INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      harga REAL NOT NULL,
      kategori_id INTEGER,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS diskon_preset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      persen REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS promo_rule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER NOT NULL,
      tipe_promo TEXT NOT NULL,
      berlaku_mulai TEXT,
      berlaku_sampai TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (menu_item_id) REFERENCES menu_item(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_order TEXT NOT NULL,
      subtotal REAL NOT NULL,
      diskon_preset_id INTEGER,
      diskon_persen REAL NOT NULL DEFAULT 0,
      diskon_nominal REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'tunai',
      uang_diterima REAL,
      kembalian REAL,
      status TEXT NOT NULL DEFAULT 'completed',
      void_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaction_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL,
      menu_item_id INTEGER,
      nama_produk TEXT NOT NULL,
      harga_satuan REAL NOT NULL,
      qty INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pengaturan (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_trx_created ON transaksi(created_at);
    CREATE INDEX IF NOT EXISTS idx_trx_status ON transaksi(status);
    CREATE INDEX IF NOT EXISTS idx_titem_trx ON transaction_item(transaksi_id);
    CREATE INDEX IF NOT EXISTS idx_menu_deleted ON menu_item(is_deleted);
  `);

  // Seed pengaturan default
  const defaults: Record<string, string> = {
    nama_umkm: 'Warung Saya',
    alamat: '',
    no_telp: '',
    footer_struk: 'Terima kasih atas kunjungan Anda 🙏',
    paper_width: '58',
    app_version: 'v1.0',
    activated: '0',
    activation_code: '',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.runAsync(
      `INSERT INTO pengaturan (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO NOTHING`,
      [key, value]
    );
  }

  // Seed preset diskon contoh (hanya jika tabel kosong)
  const cnt = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM diskon_preset`);
  if ((cnt?.n ?? 0) === 0) {
    await db.runAsync(`INSERT INTO diskon_preset (nama, persen, is_active) VALUES ('Diskon 10%', 10, 1)`);
    await db.runAsync(`INSERT INTO diskon_preset (nama, persen, is_active) VALUES ('Diskon 20%', 20, 1)`);
  }

  _initialized = true;
}
