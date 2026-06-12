/**
 * schema.ts — inisialisasi skema SQLite flat (satu blok, tanpa migration versioning).
 *
 * Tabel aktif: kategori, menu_item, stock_log, pengaturan, diskon_preset,
 * promo_rule, transaksi, transaction_item.
 *
 * DIHAPUS (drop V2): payment_session, pg_credentials
 * (tabel lama di device yang sudah ada tidak di-drop — tidak ganggu).
 */
import type * as SQLite from 'expo-sqlite';

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS kategori (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      nama    TEXT NOT NULL,
      urutan  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_item (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nama         TEXT NOT NULL,
      harga        REAL NOT NULL,
      kategori_id  INTEGER,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_deleted   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      stok         INTEGER NOT NULL DEFAULT 0,
      min_stock    INTEGER NOT NULL DEFAULT 5,
      FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stock_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id  INTEGER NOT NULL,
      type          TEXT NOT NULL,
      qty           INTEGER NOT NULL,
      stok_sebelum  INTEGER NOT NULL,
      stok_sesudah  INTEGER NOT NULL,
      note          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (menu_item_id) REFERENCES menu_item(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pengaturan (
      key    TEXT PRIMARY KEY,
      value  TEXT
    );

    CREATE TABLE IF NOT EXISTS diskon_preset (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nama      TEXT NOT NULL,
      persen    REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS promo_rule (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id   INTEGER NOT NULL,
      tipe_promo     TEXT NOT NULL,
      berlaku_mulai  TEXT,
      berlaku_sampai TEXT,
      is_active      INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (menu_item_id) REFERENCES menu_item(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transaksi (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_order      TEXT NOT NULL,
      subtotal         REAL NOT NULL,
      diskon_preset_id INTEGER,
      diskon_persen    REAL NOT NULL DEFAULT 0,
      diskon_nominal   REAL NOT NULL DEFAULT 0,
      grand_total      REAL NOT NULL,
      payment_method   TEXT NOT NULL DEFAULT 'tunai',
      uang_diterima    REAL,
      kembalian        REAL,
      status           TEXT NOT NULL DEFAULT 'completed',
      void_reason      TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transaction_item (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id  INTEGER NOT NULL,
      menu_item_id  INTEGER,
      nama_produk   TEXT NOT NULL,
      harga_satuan  REAL NOT NULL,
      qty           INTEGER NOT NULL,
      subtotal      REAL NOT NULL,
      item_type     TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trx_created   ON transaksi(created_at);
    CREATE INDEX IF NOT EXISTS idx_trx_status    ON transaksi(status);
    CREATE INDEX IF NOT EXISTS idx_titem_trx     ON transaction_item(transaksi_id);
    CREATE INDEX IF NOT EXISTS idx_menu_deleted  ON menu_item(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_stocklog_menu ON stock_log(menu_item_id);
  `);
}
