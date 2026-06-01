/**
 * types.ts — kontrak adapter Payment Gateway (versi mobile, doc 01 §6).
 *
 * Beda dari web: TIDAK ADA verifyWebhook (tidak ada webhook di HP). checkStatus
 * naik jadi mekanisme utama (polling).
 */

export type PGProvider = 'xendit' | 'midtrans' | 'doku';

/** Mode kredensial. */
export type PGMode = 'sandbox' | 'production';

/** Status pembayaran ternormalisasi lintas provider. */
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed';

export interface CreateQrisArgs {
  amount: number;     // Rupiah, integer (== grand_total)
  orderId: string;    // nomor_order / external_id unik
  label: string;      // nama transaksi singkat (untuk PG)
}

export interface QrisResult {
  qr_string: string;        // payload QRIS mentah (untuk react-native-qrcode-svg)
  qr_url?: string;          // opsional: URL gambar QR dari PG
  external_id: string;      // id transaksi di sisi PG (untuk checkStatus)
  expires_at: string;       // ISO date kedaluwarsa
}

export interface TestResult {
  ok: boolean;
  pesan: string;
}

/**
 * Kredensial yang dipakai adapter saat runtime. Secret diambil dari SecureStore,
 * BUKAN dari objek yang persist di SQLite.
 */
export interface PGRuntimeCreds {
  provider: PGProvider;
  mode: PGMode;
  /** Secret utama: Xendit Secret / Midtrans Server Key / DOKU "ClientId:ClientSecret". */
  secret: string;
  /** RSA private key PEM — KHUSUS DOKU. */
  rsaPrivateKey?: string | null;
}

/**
 * Kontrak adapter. Setiap provider mengimplementasikan ini.
 * createQris & checkStatus memanggil API PG LANGSUNG dari HP (key tenant).
 */
export interface PGAdapter {
  provider: PGProvider;
  createQris(args: CreateQrisArgs, creds: PGRuntimeCreds): Promise<QrisResult>;
  checkStatus(externalId: string, creds: PGRuntimeCreds): Promise<PaymentStatus>;
  testConnection(creds: PGRuntimeCreds): Promise<TestResult>;
}

/** Base URL per mode untuk tiap provider. */
export interface ProviderEndpoints {
  sandbox: string;
  production: string;
}
