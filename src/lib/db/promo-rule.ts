/**
 * Akses data aturan promo (BOGO / Buy2Get1) per produk.
 */
import { getDb, PromoRule, TipePromo } from './database';

export interface PromoRuleInput {
  menu_item_id: number;
  tipe_promo: TipePromo;
  berlaku_mulai: string;            // '' → otomatis sekarang
  berlaku_sampai: string | null;    // null → tanpa batas
}

/** Semua promo (untuk halaman kelola), termasuk nama produk. */
export async function getPromoRules(): Promise<PromoRule[]> {
  const db = getDb();
  return db.getAllAsync<PromoRule>(
    `SELECT p.id, p.menu_item_id, p.tipe_promo, p.berlaku_mulai, p.berlaku_sampai,
            p.is_active, m.nama AS nama_produk
     FROM promo_rule p
     JOIN menu_item m ON m.id = p.menu_item_id
     ORDER BY p.id DESC`
  );
}

/** Promo aktif & dalam rentang waktu (untuk mesin promo di kasir). */
export async function getPromoAktif(): Promise<PromoRule[]> {
  const db = getDb();
  return db.getAllAsync<PromoRule>(
    `SELECT p.id, p.menu_item_id, p.tipe_promo, p.berlaku_mulai, p.berlaku_sampai,
            p.is_active, m.nama AS nama_produk
     FROM promo_rule p
     JOIN menu_item m ON m.id = p.menu_item_id
     WHERE p.is_active = 1
       AND (p.berlaku_mulai IS NULL OR p.berlaku_mulai <= datetime('now','localtime'))
       AND (p.berlaku_sampai IS NULL OR p.berlaku_sampai >= datetime('now','localtime'))
       AND m.is_deleted = 0 AND m.is_available = 1`
  );
}

export async function tambahPromoRule(input: PromoRuleInput): Promise<void> {
  const db = getDb();
  const mulai = input.berlaku_mulai && input.berlaku_mulai.trim()
    ? input.berlaku_mulai
    : null; // null = mulai sekarang (selalu lolos cek <= now)
  await db.runAsync(
    `INSERT INTO promo_rule (menu_item_id, tipe_promo, berlaku_mulai, berlaku_sampai, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [input.menu_item_id, input.tipe_promo, mulai, input.berlaku_sampai]
  );
}

export async function hapusPromoRule(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE promo_rule SET is_active = 0 WHERE id = ?`, [id]);
}
