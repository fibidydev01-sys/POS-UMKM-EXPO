/**
 * migrations.ts — migration runner berurut (doc 02 Phase 0).
 *
 * Setiap migrasi punya nomor urut & SQL. schema_version menyimpan versi terakhir
 * yang sudah dijalankan. Aman dipanggil tiap start (idempotent).
 *
 * Menambah migrasi baru: tambahkan entri ke array MIGRATIONS dengan version
 * berikutnya. JANGAN mengubah migrasi lama yang sudah rilis.
 */
import type * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'init_core',
    sql: `
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
    `,
  },
  {
    version: 2,
    name: 'qris_payment_layer',
    sql: `
      -- Kolom referensi QRIS pada transaksi (provider + external_id PG).
      ALTER TABLE transaksi ADD COLUMN qris_provider TEXT;
      ALTER TABLE transaksi ADD COLUMN qris_external_id TEXT;

      -- METADATA kredensial PG (secret asli ada di SecureStore, BUKAN di sini).
      CREATE TABLE IF NOT EXISTS pg_credentials (
        provider TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'sandbox',
        is_active INTEGER NOT NULL DEFAULT 0,
        has_secret INTEGER NOT NULL DEFAULT 0,
        label TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      -- Sesi pembayaran QRIS (selamat dari app dibunuh; basis rekonsiliasi).
      CREATE TABLE IF NOT EXISTS payment_session (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        external_id TEXT NOT NULL,
        qr_string TEXT NOT NULL,
        qr_url TEXT,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        cart_snapshot TEXT NOT NULL,
        diskon_preset_id INTEGER,
        diskon_persen REAL NOT NULL DEFAULT 0,
        transaksi_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_status ON payment_session(status);
      CREATE INDEX IF NOT EXISTS idx_session_created ON payment_session(created_at);
    `,
  },
];

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function setUserVersion(db: SQLite.SQLiteDatabase, v: number): Promise<void> {
  // PRAGMA tidak menerima parameter binding → interpolasi angka (aman, integer).
  await db.execAsync(`PRAGMA user_version = ${v}`);
}

/**
 * Jalankan semua migrasi yang versinya > user_version saat ini.
 * Tiap migrasi dibungkus transaksi; gagal → rollback migrasi itu.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const current = await getUserVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version);

  for (const m of pending) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
    });
    await setUserVersion(db, m.version);
  }
}

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
