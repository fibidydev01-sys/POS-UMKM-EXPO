/**
 * Format & parsing mata uang Rupiah.
 */

/** "Rp1.250.000" — tanpa desimal (kebiasaan UMKM). */
export function formatRupiah(nilai: number): string {
  const n = Math.round(nilai || 0);
  return 'Rp' + formatAngka(n);
}

/** "1.250.000" — pemisah ribuan titik, tanpa prefix. */
export function formatAngka(nilai: number): string {
  const n = Math.round(nilai || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Ambil angka dari string apa pun ("Rp1.250" / "1250" → 1250). */
export function parseRupiah(teks: string): number {
  if (!teks) return 0;
  const digits = String(teks).replace(/[^0-9]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}
