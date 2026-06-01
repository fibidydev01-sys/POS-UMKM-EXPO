/**
 * transaksi-qris.ts — menulis transaksi hasil pembayaran QRIS.
 *
 * Dipisah dari transaksi.ts (cash) agar perubahan minimal & jelas. Memakai
 * builder yang SAMA (hitungGrandTotal) sehingga nominal tercatat == amount QR.
 *
 * ANTI-DOBEL (R8/Phase 2):
 *   - Hanya menulis bila session.transaksi_id masih null.
 *   - Seluruh proses (insert transaksi + items + tautkan ke session) dalam SATU
 *     transaksi SQLite.
 */
import { getDb } from './database';
import type { CartItem } from './database';
import { hitungGrandTotal } from '../cart/promo-engine';
import type { PaymentSession } from './payment-session';
import { parseCartSnapshot } from './payment-session';

/** Nomor order harian ORD-YYYYMMDD-NNN (sinkron dgn versi cash). */
async function buatNomorOrder(): Promise<string> {
  const db = getDb();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const tgl = `${y}${m}${d}`;
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transaksi WHERE date(created_at) = date('now','localtime')`
  );
  const urut = String((row?.n ?? 0) + 1).padStart(3, '0');
  return `ORD-${tgl}-${urut}`;
}

export interface SettleHasil {
  transaksiId: number;
  nomorOrder: string;
  sudahAda: boolean; // true bila transaksi sudah pernah ditulis (idempoten)
}

/**
 * Tulis transaksi dari sesi yang sudah `paid`. Idempoten: jika session sudah
 * punya transaksi_id, kembalikan yang lama tanpa menulis lagi.
 */
export async function settleSessionPaid(session: PaymentSession): Promise<SettleHasil> {
  const db = getDb();

  // Sudah pernah ditulis? (anti-dobel)
  if (session.transaksi_id != null) {
    const row = await db.getFirstAsync<{ nomor_order: string }>(
      `SELECT nomor_order FROM transaksi WHERE id = ?`,
      [session.transaksi_id]
    );
    return {
      transaksiId: session.transaksi_id,
      nomorOrder: row?.nomor_order ?? '',
      sudahAda: true,
    };
  }

  const cart: CartItem[] = parseCartSnapshot(session);
  const { subtotal, diskonNominal, grandTotal } = hitungGrandTotal(cart, session.diskon_persen);
  const nomorOrder = await buatNomorOrder();

  let transaksiId = 0;

  await db.withTransactionAsync(async () => {
    // Re-cek di dalam transaksi (hindari race dgn rekonsiliasi paralel).
    const cek = await db.getFirstAsync<{ transaksi_id: number | null }>(
      `SELECT transaksi_id FROM payment_session WHERE id = ?`,
      [session.id]
    );
    if (cek?.transaksi_id != null) {
      transaksiId = cek.transaksi_id;
      return;
    }

    const res = await db.runAsync(
      `INSERT INTO transaksi
        (nomor_order, subtotal, diskon_preset_id, diskon_persen, diskon_nominal,
         grand_total, payment_method, uang_diterima, kembalian, status,
         qris_provider, qris_external_id)
       VALUES (?, ?, ?, ?, ?, ?, 'qris', NULL, NULL, 'completed', ?, ?)`,
      [
        nomorOrder, subtotal, session.diskon_preset_id, session.diskon_persen, diskonNominal,
        grandTotal, session.provider, session.external_id,
      ]
    );
    transaksiId = res.lastInsertRowId as number;

    for (const it of cart) {
      const tipe = it.item_type === 'promo_free' ? 'promo_free' : 'normal';
      const sub = tipe === 'promo_free' ? 0 : it.harga_satuan * it.qty;
      await db.runAsync(
        `INSERT INTO transaction_item
          (transaksi_id, menu_item_id, nama_produk, harga_satuan, qty, subtotal, item_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [transaksiId, it.menu_item_id, it.nama_produk, it.harga_satuan, it.qty, sub, tipe]
      );
    }

    // Tautkan & tandai paid dalam transaksi yang sama.
    await db.runAsync(
      `UPDATE payment_session SET transaksi_id = ?, status = 'paid' WHERE id = ?`,
      [transaksiId, session.id]
    );
  });

  return { transaksiId, nomorOrder, sudahAda: false };
}
