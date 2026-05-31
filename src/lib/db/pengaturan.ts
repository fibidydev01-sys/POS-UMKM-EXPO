/**
 * Akses konfigurasi UMKM (key-value di tabel pengaturan).
 */
import { getDb, UmkmConfig } from './database';

interface ProfilInput {
  nama_umkm: string;
  alamat: string;
  no_telp: string;
  footer_struk: string;
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
    nama_umkm: m.nama_umkm ?? 'Warung Saya',
    alamat: m.alamat ?? '',
    no_telp: m.no_telp ?? '',
    footer_struk: m.footer_struk ?? '',
    paper_width: parseInt(m.paper_width ?? '58', 10) || 58,
    app_version: m.app_version ?? 'v1.0',
    activated: m.activated === '1',
    activation_code: m.activation_code ? m.activation_code : null,
  };
}

export async function updateProfil(input: ProfilInput): Promise<void> {
  await setKey('nama_umkm', input.nama_umkm.trim());
  await setKey('alamat', input.alamat.trim());
  await setKey('no_telp', input.no_telp.trim());
  await setKey('footer_struk', input.footer_struk);
}

export async function updatePaperWidth(width: number): Promise<void> {
  await setKey('paper_width', String(width));
}

export async function setActivation(code: string): Promise<void> {
  await setKey('activated', '1');
  await setKey('activation_code', code);
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await setKey(key, value);
}
