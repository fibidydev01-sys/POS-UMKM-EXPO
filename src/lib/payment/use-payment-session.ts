/**
 * use-payment-session.ts — state machine pembayaran QRIS + polling.
 *
 * Alur (doc 01 §8):
 *   idle → creating → pending → paid | expired | failed
 *
 *   creating : hitung amount (builder yang sama) → INSERT payment_session(pending)
 *              → adapter.createQris() → simpan qr_string.
 *   pending  : tampil QR + countdown; polling LIFECYCLE-AWARE (lihat di bawah).
 *              paid → settleSessionPaid() (tulis transaksi, anti-dobel).
 *   expired  : lewat expires_at atau status PG expired.
 *
 * R5′: cek amount cocok dipakai saat createQris (amount == grandTotal builder).
 * R6 : satu sesi pending per HP — guard via adaSessionPending().
 *
 * ── STRATEGI POLLING (doc 02b — Lifecycle-Aware + Adaptive Backoff) ──────────
 *
 *   Modal QR BUKA  → polling NYALA
 *   Modal QR TUTUP → polling MATI (state pending TETAP tersimpan di SQLite)
 *   Modal QR BUKA lagi → polling RESUME dari state pending
 *
 *   Interval normal : POLL_MS_NORMAL (~1 dtk) — instan untuk mata manusia,
 *                     tetapi AMAN dari rate limit PG (429) & ramah baterai.
 *   Saat error/timeout: adaptive backoff BACKOFF_STEPS (5→10→20 dtk).
 *   Saat pulih      : reset ke interval normal (tanpa "hukuman" permanen).
 *
 *   Catatan desain (disengaja): kami TIDAK memakai loop tanpa jeda. Rate limit
 *   Xendit/Midtrans/DOKU berlaku PER-AKUN milik tenant; loop tanpa delay dari
 *   satu HP mudah menembus batas per-detik → 429 → status QR gagal terbaca
 *   tepat saat pembeli sudah membayar. ~1 dtk sudah terasa seketika bagi
 *   manusia di depan QR. Lihat doc 02b "Interval".
 *
 *   Polling adalah loop yang menjadwalkan-ulang dirinya sendiri (setTimeout),
 *   BUKAN setInterval — agar jeda berikutnya selalu dihitung SETELAH response
 *   (atau setelah backoff), sehingga tidak menumpuk request saat jaringan lambat.
 *
 *   Stop polling terjadi natural di DUA jalur:
 *     1) loop berhenti dari dalam saat fase jadi paid/expired/failed.
 *     2) modal menutup → cleanup useFocusEffect memanggil stopPolling() dari luar.
 *   Keduanya idempoten — polling tidak mungkin "bocor".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem } from '../db/database';
import type { PaymentStatus } from '../pg/types';
import { hitungGrandTotal } from '../cart/promo-engine';
import { getAdapter, rakitCredsAktif } from '../pg/registry';
import { getPgAktif } from '../db/pg-credentials';
import {
  buatSession, adaSessionPending, getSession, setSessionStatus,
  type PaymentSession,
} from '../db/payment-session';
import { settleSessionPaid, type SettleHasil } from '../db/transaksi-qris';
import { uuid } from '../pg/crypto-doku';

export type FaseBayar = 'idle' | 'creating' | 'pending' | 'paid' | 'expired' | 'failed';

/** Interval polling saat kondisi NORMAL (response cepat). ~1 dtk: instan tapi aman. */
const POLL_MS_NORMAL = 1000;

/** Backoff khusus kondisi ERROR/TIMEOUT (ms). Bukan exponential backoff klasik:
 *  hanya berlaku saat gagal; sekali berhasil → kembali ke POLL_MS_NORMAL. */
const BACKOFF_STEPS = [5000, 10000, 20000];

export interface MulaiArgs {
  cart: CartItem[];
  diskonPresetId: number | null;
  diskonPersen: number;
  label?: string;
}

export interface PaymentSessionState {
  fase: FaseBayar;
  session: PaymentSession | null;
  sisaDetik: number;
  error: string | null;
  /** true saat sedang backoff karena jaringan bermasalah (untuk pesan UI). */
  jaringanBermasalah: boolean;
  hasilSettle: SettleHasil | null;
  mulai: (args: MulaiArgs) => Promise<void>;
  batal: () => Promise<void>;
  reset: () => void;
  /** Bind ke lifecycle modal QR: panggil saat modal fokus. */
  startPolling: () => void;
  /** Bind ke lifecycle modal QR: panggil saat modal blur/unmount. */
  stopPolling: () => void;
}

function detikSampai(iso: string): number {
  const t = new Date(iso.replace(' ', 'T')).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - Date.now()) / 1000));
}

export function usePaymentSession(): PaymentSessionState {
  const [fase, setFase] = useState<FaseBayar>('idle');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [sisaDetik, setSisaDetik] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jaringanBermasalah, setJaringanBermasalah] = useState(false);
  const [hasilSettle, setHasilSettle] = useState<SettleHasil | null>(null);

  // Gerbang polling (on/off). Loop berhenti total saat false.
  const pollingRef = useRef<boolean>(false);
  // Handle timeout untuk jadwal poll berikutnya (self-scheduling).
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Indeks backoff saat ini (0 = normal).
  const backoffRef = useRef<number>(0);
  // Countdown kedaluwarsa (terpisah dari polling).
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Sesi yang sedang aktif.
  const aktifId = useRef<string | null>(null);

  const batalkanJadwalPoll = useCallback(() => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  /** Matikan polling total (idempoten). Tidak mengubah state/fase. */
  const stopPolling = useCallback(() => {
    pollingRef.current = false;
    batalkanJadwalPoll();
  }, [batalkanJadwalPoll]);

  const stopSemua = useCallback(() => {
    stopPolling();
    stopTick();
  }, [stopPolling, stopTick]);

  const reset = useCallback(() => {
    stopSemua();
    aktifId.current = null;
    backoffRef.current = 0;
    setFase('idle');
    setSession(null);
    setSisaDetik(0);
    setError(null);
    setJaringanBermasalah(false);
    setHasilSettle(null);
  }, [stopSemua]);

  // Bersihkan semua timer saat unmount.
  useEffect(() => stopSemua, [stopSemua]);

  /** Jadwalkan poll berikutnya dengan delay tertentu (jika polling masih nyala). */
  const jadwalkan = useCallback((delay: number, fn: () => void) => {
    batalkanJadwalPoll();
    if (!pollingRef.current) return;
    pollTimerRef.current = setTimeout(() => {
      if (pollingRef.current) fn();
    }, delay);
  }, [batalkanJadwalPoll]);

  /**
   * Satu iterasi loop polling. Menjadwalkan dirinya sendiri:
   *   - sukses & masih pending → jadwal lagi POLL_MS_NORMAL (reset backoff).
   *   - paid/expired/failed     → set fase, BERHENTI (tidak menjadwalkan).
   *   - error/timeout           → jadwal lagi dengan delay backoff bertingkat.
   */
  const pollLoop = useCallback(async () => {
    if (!pollingRef.current) return;
    const id = aktifId.current;
    if (!id) { stopPolling(); return; }

    const s = await getSession(id);
    if (!s) { stopPolling(); return; }

    // Expiry lokal lebih dulu (doc 02b: rekonsiliasi & expiry tetap berlaku).
    if (detikSampai(s.expires_at) <= 0) {
      await setSessionStatus(id, 'expired');
      setFase('expired');
      stopSemua();
      return;
    }

    const creds = await rakitCredsAktif();
    if (!creds) {
      // Anggap seperti error transient: backoff, jangan matikan total.
      setError('Kredensial PG tidak tersedia.');
      setJaringanBermasalah(true);
      const delay = BACKOFF_STEPS[backoffRef.current] ?? BACKOFF_STEPS[BACKOFF_STEPS.length - 1];
      backoffRef.current = Math.min(backoffRef.current + 1, BACKOFF_STEPS.length - 1);
      jadwalkan(delay, () => { void pollLoop(); });
      return;
    }

    let status: PaymentStatus;
    try {
      status = await getAdapter(creds.provider).checkStatus(s.external_id, creds);
      // Berhasil menghubungi PG → reset backoff & flag jaringan.
      backoffRef.current = 0;
      if (jaringanBermasalah) setJaringanBermasalah(false);
    } catch {
      // Timeout / network error → adaptive backoff (doc 02b).
      setJaringanBermasalah(true);
      const delay = BACKOFF_STEPS[backoffRef.current] ?? BACKOFF_STEPS[BACKOFF_STEPS.length - 1];
      backoffRef.current = Math.min(backoffRef.current + 1, BACKOFF_STEPS.length - 1);
      jadwalkan(delay, () => { void pollLoop(); });
      return;
    }

    if (status === 'paid') {
      stopSemua();
      const hasil = await settleSessionPaid(s);
      const fresh = await getSession(id);
      setSession(fresh);
      setHasilSettle(hasil);
      setFase('paid');
      return; // berhenti — tidak menjadwalkan lagi
    }
    if (status === 'expired') {
      await setSessionStatus(id, 'expired');
      setFase('expired');
      stopSemua();
      return;
    }
    if (status === 'failed') {
      await setSessionStatus(id, 'failed');
      setFase('failed');
      stopSemua();
      return;
    }

    // Masih pending → jadwalkan iterasi berikutnya pada interval normal.
    jadwalkan(POLL_MS_NORMAL, () => { void pollLoop(); });
  }, [jadwalkan, jaringanBermasalah, stopPolling, stopSemua]);

  /** Mulai countdown kedaluwarsa (idempoten — hentikan dulu yang lama). */
  const mulaiTick = useCallback((s: PaymentSession) => {
    stopTick();
    setSisaDetik(detikSampai(s.expires_at));
    tickRef.current = setInterval(() => {
      setSisaDetik((prev) => (prev - 1 < 0 ? 0 : prev - 1));
    }, 1000);
  }, [stopTick]);

  /**
   * Nyalakan polling untuk sesi aktif. Dipanggil:
   *   - otomatis saat sesi dibuat / di-resume (mulai()), DAN
   *   - oleh layar via useFocusEffect saat modal QR fokus.
   * Idempoten: jika sudah menyala, tidak menggandakan loop.
   */
  const startPolling = useCallback(() => {
    if (!aktifId.current) return;       // tidak ada sesi → tidak ada yang dipoll
    if (pollingRef.current) return;     // sudah jalan
    pollingRef.current = true;
    backoffRef.current = 0;
    setJaringanBermasalah(false);
    // Cek instan sekali agar responsif, lalu loop menjadwalkan sendiri.
    void pollLoop();
  }, [pollLoop]);

  /** Siapkan sesi aktif (set id + countdown) lalu nyalakan polling. */
  const aktifkanSesi = useCallback((s: PaymentSession) => {
    aktifId.current = s.id;
    mulaiTick(s);
    startPolling();
  }, [mulaiTick, startPolling]);

  const mulai = useCallback(async (args: MulaiArgs) => {
    setError(null);
    setHasilSettle(null);
    setJaringanBermasalah(false);

    // R6: satu sesi pending per HP.
    const existing = await adaSessionPending();
    if (existing) {
      setSession(existing);
      setFase('pending');
      aktifkanSesi(existing);
      return;
    }

    const meta = await getPgAktif();
    if (!meta) { setError('Belum ada PG aktif. Atur di Pengaturan → Pembayaran QRIS.'); setFase('failed'); return; }

    const creds = await rakitCredsAktif();
    if (!creds) { setError('Secret PG tidak ditemukan di perangkat.'); setFase('failed'); return; }

    const { grandTotal } = hitungGrandTotal(args.cart, args.diskonPersen);
    if (grandTotal <= 0) { setError('Total tidak valid.'); setFase('failed'); return; }

    setFase('creating');
    const orderId = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sessionId = uuid();

    try {
      const qr = await getAdapter(creds.provider).createQris(
        { amount: grandTotal, orderId, label: args.label ?? 'Pembayaran' },
        creds
      );

      await buatSession({
        id: sessionId,
        provider: creds.provider,
        external_id: qr.external_id,
        qr_string: qr.qr_string,
        qr_url: qr.qr_url ?? null,
        amount: grandTotal,
        cart: args.cart,
        diskonPresetId: args.diskonPresetId,
        diskonPersen: args.diskonPersen,
        expires_at: qr.expires_at,
      });

      const s = await getSession(sessionId);
      setSession(s);
      setFase('pending');
      if (s) aktifkanSesi(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat QR.';
      setError(msg);
      setFase('failed');
    }
  }, [aktifkanSesi]);

  const batal = useCallback(async () => {
    const id = aktifId.current;
    stopSemua();
    if (id) await setSessionStatus(id, 'failed');
    reset();
  }, [reset, stopSemua]);

  return {
    fase, session, sisaDetik, error, jaringanBermasalah, hasilSettle,
    mulai, batal, reset, startPolling, stopPolling,
  };
}
