/**
 * pengaturan.ts — akses konfigurasi UMKM (key-value di tabel pengaturan).
 * Setelah drop V2: tidak ada field tier, tidak ada normalTier(), getTier().
 */
import type { UmkmConfig } from './database';
import { getDb } from './database';

export interface ProfilInput {
  nama_umkm?: string;
  alamat?: string;
  no_telp?: string;
  footer_struk?: string;
  paper_width?: number;
}

async function getAll(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db.getAllAsync<{ key: string; value: string | null }>(
    `SELECT key, value FROM pengaturan`
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value ?? ''; });
  return map;
}

async function setKey(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO pengaturan (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function getConfig(): Promise<UmkmConfig> {
  const m = await getAll();
  return {
    nama_umkm:       m.nama_umkm      ?? 'Warung Saya',
    alamat:          m.alamat         ?? '',
    no_telp:         m.no_telp        ?? '',
    footer_struk:    m.footer_struk   ?? '',
    paper_width:     parseInt(m.paper_width ?? '58', 10) || 58,
    app_version:     m.app_version    ?? 'v1.0',
    umkm_id:         m.umkm_id ? m.umkm_id : null,
    activated:       m.activated === '1',
    activation_code: m.activation_code ? m.activation_code : null,
    // tier tidak ada lagi
  };
}

export async function updateProfil(input: ProfilInput): Promise<void> {
  if (input.nama_umkm    !== undefined) await setKey('nama_umkm', (input.nama_umkm ?? '').trim());
  if (input.alamat       !== undefined) await setKey('alamat', (input.alamat ?? '').trim());
  if (input.no_telp      !== undefined) await setKey('no_telp', (input.no_telp ?? '').trim());
  if (input.footer_struk !== undefined) await setKey('footer_struk', input.footer_struk ?? '');
  if (input.paper_width  !== undefined) await setKey('paper_width', String(input.paper_width));
}

export async function updatePaperWidth(width: number): Promise<void> {
  await setKey('paper_width', String(width));
}

export async function setActivation(code: string): Promise<void> {
  await setKey('activated', '1');
  await setKey('activation_code', code);
}

export async function setKonfigBanyak(entries: Record<string, string>): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(entries)) {
      await db.runAsync(
        `INSERT INTO pengaturan (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
      );
    }
  });
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await setKey(key, value);
}
