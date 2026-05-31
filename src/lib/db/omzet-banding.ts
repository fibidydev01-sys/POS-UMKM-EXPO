/**
 * omzet-banding.ts — data omzet harian untuk grafik perbandingan
 * minggu ini vs minggu lalu (7 hari masing-masing).
 */
import { getDb } from './database';

export interface OmzetHari {
  tanggal: string; // 'YYYY-MM-DD'
  total: number;
  label: string;   // nama hari pendek: Sen, Sel, ...
}

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function tanggalStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function omzetRange(db: ReturnType<typeof getDb>, mulai: Date, hariCount: number): Promise<OmzetHari[]> {
  // Ambil total per tanggal dalam rentang sekali query, lalu petakan ke hari.
  const akhir = new Date(mulai);
  akhir.setDate(akhir.getDate() + hariCount - 1);

  const rows = await db.getAllAsync<{ tgl: string; total: number }>(
    `SELECT date(created_at) AS tgl, COALESCE(SUM(grand_total),0) AS total
     FROM transaksi
     WHERE status = 'completed'
       AND date(created_at) BETWEEN date(?) AND date(?)
     GROUP BY date(created_at)`,
    [tanggalStr(mulai), tanggalStr(akhir)]
  );
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r.tgl, r.total));

  const hasil: OmzetHari[] = [];
  for (let i = 0; i < hariCount; i++) {
    const d = new Date(mulai);
    d.setDate(d.getDate() + i);
    const ts = tanggalStr(d);
    hasil.push({ tanggal: ts, total: map.get(ts) ?? 0, label: HARI[d.getDay()] });
  }
  return hasil;
}

/**
 * Mengembalikan 7 hari minggu ini (mulai 6 hari lalu s/d hari ini) dan
 * 7 hari minggu sebelumnya (13 s/d 7 hari lalu).
 */
export async function getOmzetDuaMinggu(): Promise<{ ini: OmzetHari[]; lalu: OmzetHari[] }> {
  const db = getDb();
  const hariIni = new Date();

  const mulaiIni = new Date(hariIni);
  mulaiIni.setDate(mulaiIni.getDate() - 6);

  const mulaiLalu = new Date(hariIni);
  mulaiLalu.setDate(mulaiLalu.getDate() - 13);

  const [ini, lalu] = await Promise.all([
    omzetRange(db, mulaiIni, 7),
    omzetRange(db, mulaiLalu, 7),
  ]);
  return { ini, lalu };
}
