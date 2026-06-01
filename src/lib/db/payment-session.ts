/**
 * payment-session.ts — siklus hidup sesi pembayaran QRIS (R6/R7/R8).
 *
 * Sesi hidup di SQLite agar SELAMAT dari app dibunuh (Phase 2). Rekonsiliasi
 * membaca sesi pending lalu menanya ulang PG.
 *
 * Anti-dobel: transaksi_id di-set sekali; cek sebelum menulis transaksi.
 */
import { getDb } from './database';
import type { PGProvider, PaymentStatus } from '../pg/types';
import type { CartItem } from './database';

export interface PaymentSession {
  id: string;
  provider: PGProvider;
  external_id: string;
  qr_string: string;
  qr_url: string | null;
  amount: number;
  status: PaymentStatus;
  cart_snapshot: string;          // JSON CartItem[]
  diskon_preset_id: number | null;
  diskon_persen: number;
  transaksi_id: number | null;
  created_at: string;
  expires_at: string;
}

export interface BuatSessionInput {
  id: string;
  provider: PGProvider;
  external_id: string;
  qr_string: string;
  qr_url?: string | null;
  amount: number;
  cart: CartItem[];
  diskonPresetId: number | null;
  diskonPersen: number;
  expires_at: string;
}

/** Apakah ada sesi pending aktif (R6: 1 pending per HP). */
export async function adaSessionPending(): Promise<PaymentSession | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PaymentSession>(
    `SELECT * FROM payment_session WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
  );
  return row ?? null;
}

export async function buatSession(input: BuatSessionInput): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO payment_session
      (id, provider, external_id, qr_string, qr_url, amount, status,
       cart_snapshot, diskon_preset_id, diskon_persen, transaksi_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL, datetime('now','localtime'), ?)`,
    [
      input.id, input.provider, input.external_id, input.qr_string, input.qr_url ?? null,
      Math.round(input.amount), JSON.stringify(input.cart),
      input.diskonPresetId, input.diskonPersen, input.expires_at,
    ]
  );
}

export async function getSession(id: string): Promise<PaymentSession | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PaymentSession>(`SELECT * FROM payment_session WHERE id = ?`, [id]);
  return row ?? null;
}

export async function getSessionsByStatus(status: PaymentStatus): Promise<PaymentSession[]> {
  const db = getDb();
  return db.getAllAsync<PaymentSession>(
    `SELECT * FROM payment_session WHERE status = ? ORDER BY created_at DESC`,
    [status]
  );
}

export async function setSessionStatus(id: string, status: PaymentStatus): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE payment_session SET status = ? WHERE id = ?`, [status, id]);
}

/** Tautkan transaksi yang sudah ditulis ke sesi (anti-dobel). */
export async function setSessionTransaksi(id: string, transaksiId: number): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE payment_session SET transaksi_id = ?, status = 'paid' WHERE id = ?`,
    [transaksiId, id]
  );
}

export function parseCartSnapshot(s: PaymentSession): CartItem[] {
  try {
    return JSON.parse(s.cart_snapshot) as CartItem[];
  } catch {
    return [];
  }
}

/** Bersihkan sesi lama yang sudah selesai (housekeeping opsional). */
export async function hapusSessionSelesaiLama(hariLalu = 7): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `DELETE FROM payment_session
     WHERE status IN ('paid','expired','failed')
       AND date(created_at) < date('now','localtime', ?)`,
    [`-${hariLalu} days`]
  );
}
