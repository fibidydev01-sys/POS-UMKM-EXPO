/**
 * aktivasi.ts — aktivasi lisensi OFFLINE.
 *
 * Skema sederhana tanpa server: kode aktivasi valid bila checksum-nya cocok
 * dengan pola yang ditanam di aplikasi. Cukup untuk model "bayar sekali,
 * pakai selamanya" pada distribusi terbatas. Bisa diganti dengan verifikasi
 * tanda tangan bila diperlukan.
 */
import { setActivation, getConfig } from '../db/pengaturan';

const FORMAT = /^POS-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Checksum ringan: jumlah char body mod 36 → 1 karakter base36. */
function checksum(body: string): string {
  let s = 0;
  for (let i = 0; i < body.length; i++) s += body.charCodeAt(i);
  return (s % 36).toString(36).toUpperCase();
}

/**
 * Validasi kode. Aturan: "POS-XXXX-YYYZ" di mana Z = checksum dari "XXXXYYY".
 * (Z adalah karakter terakhir.)
 */
export function validasiKode(kode: string): boolean {
  const k = kode.trim().toUpperCase();
  if (!FORMAT.test(k)) return false;
  const body = k.replace(/-/g, '');         // POS + 8 char
  const inti = body.slice(3);               // 8 char setelah 'POS'
  const tanpaCheck = inti.slice(0, 7);
  const check = inti.slice(7);
  return checksum(tanpaCheck) === check;
}

export async function aktivasi(kode: string): Promise<{ ok: boolean; pesan: string }> {
  const k = kode.trim().toUpperCase();
  if (!validasiKode(k)) {
    return { ok: false, pesan: 'Kode aktivasi tidak valid. Periksa kembali.' };
  }
  await setActivation(k);
  return { ok: true, pesan: 'Aktivasi berhasil. Terima kasih!' };
}

export async function sudahAktif(): Promise<boolean> {
  const cfg = await getConfig();
  return cfg.activated;
}
