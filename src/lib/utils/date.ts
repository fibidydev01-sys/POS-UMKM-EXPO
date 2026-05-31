/**
 * Util tanggal — ringan, tanpa dependency. Format Indonesia.
 */

const BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // SQLite 'YYYY-MM-DD HH:MM:SS' (local) → pastikan diparse sebagai lokal.
  const iso = String(input).replace(' ', 'T');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** "12 Mei 2026, 14:30" */
export function formatTanggalJam(input: string | Date): string {
  const d = toDate(input);
  const tgl = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  const jam = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${tgl}, ${jam}`;
}

/** "12 Mei 2026" */
export function formatTanggal(input: string | Date): string {
  const d = toDate(input);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Label nama hari pendek: "Sen", "Sel", ... */
export function namaHari(input: string | Date): string {
  const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return hari[toDate(input).getDay()];
}

/** Sapaan sesuai jam: Selamat pagi/siang/sore/malam. */
export function sapaan(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
