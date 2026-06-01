/**
 * reconcile.ts — rekonsiliasi sesi pending (Phase 2).
 *
 * Pengganti ketahanan webhook. Dipanggil:
 *   - saat app START (setelah DB siap),
 *   - saat app kembali ke FOREGROUND (AppState 'active').
 *
 * Untuk tiap session 'pending':
 *   - lewat expires_at → tandai 'expired'.
 *   - else checkStatus → paid: tulis transaksi (anti-dobel); expired/failed: tandai.
 *
 * Aman dipanggil berkali-kali (idempoten). Tidak melempar — menelan error agar
 * tidak mengganggu UI; kembalikan ringkasan untuk logging/observability.
 */
import { getSessionsByStatus, setSessionStatus, type PaymentSession } from '../db/payment-session';
import { settleSessionPaid } from '../db/transaksi-qris';
import { getAdapter, rakitCreds } from '../pg/registry';
import type { PaymentStatus } from '../pg/types';

export interface ReconcileRingkasan {
  diperiksa: number;
  disettle: number;   // jadi paid + transaksi tertulis
  kadaluarsa: number;
  gagal: number;
  tetapPending: number;
}

function detikSampai(iso: string): number {
  const t = new Date(iso.replace(' ', 'T')).getTime();
  if (isNaN(t)) return 0;
  return Math.floor((t - Date.now()) / 1000);
}

async function statusSesi(s: PaymentSession): Promise<PaymentStatus> {
  const creds = await rakitCreds(s.provider);
  if (!creds) return 'pending'; // tak ada secret → jangan ubah
  try {
    return await getAdapter(s.provider).checkStatus(s.external_id, creds);
  } catch {
    return 'pending';
  }
}

export async function rekonsiliasi(): Promise<ReconcileRingkasan> {
  const ring: ReconcileRingkasan = {
    diperiksa: 0, disettle: 0, kadaluarsa: 0, gagal: 0, tetapPending: 0,
  };

  let pendings: PaymentSession[] = [];
  try {
    pendings = await getSessionsByStatus('pending');
  } catch {
    return ring;
  }

  for (const s of pendings) {
    ring.diperiksa++;

    // Expiry lokal lebih dulu.
    if (detikSampai(s.expires_at) <= 0) {
      try { await setSessionStatus(s.id, 'expired'); } catch { /* abaikan */ }
      ring.kadaluarsa++;
      continue;
    }

    const status = await statusSesi(s);
    if (status === 'paid') {
      try {
        await settleSessionPaid(s); // anti-dobel di dalam
        ring.disettle++;
      } catch {
        ring.gagal++;
      }
    } else if (status === 'expired') {
      try { await setSessionStatus(s.id, 'expired'); } catch { /* abaikan */ }
      ring.kadaluarsa++;
    } else if (status === 'failed') {
      try { await setSessionStatus(s.id, 'failed'); } catch { /* abaikan */ }
      ring.gagal++;
    } else {
      ring.tetapPending++;
    }
  }

  return ring;
}
