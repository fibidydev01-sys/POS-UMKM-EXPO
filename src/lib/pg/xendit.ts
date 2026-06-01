/**
 * xendit.ts — adapter Xendit QR Codes API v2 (Phase 1).
 *
 * Auth: Basic, username = Secret Key, password kosong.
 * createQris : POST /qr_codes  (type DYNAMIC)
 * checkStatus: GET  /qr_codes/{id}  → map status
 *
 * Catatan: nominal Xendit dalam Rupiah utuh (integer), sama dgn grand_total.
 * Verifikasi field & versi header di akun sandbox Anda (doc 02 Phase 1).
 */
import type {
  PGAdapter, CreateQrisArgs, QrisResult, PaymentStatus, TestResult, PGRuntimeCreds, ProviderEndpoints,
} from './types';
import { httpJson, basicAuth } from './http';

const ENDPOINTS: ProviderEndpoints = {
  // Xendit memakai base yang sama; mode dibedakan oleh secret key (test/live).
  sandbox: 'https://api.xendit.co',
  production: 'https://api.xendit.co',
};

interface XenditQrResp {
  id?: string;
  qr_string?: string;
  status?: string;
  expires_at?: string;
  message?: string;
  error_code?: string;
}

function mapStatus(s?: string): PaymentStatus {
  switch ((s ?? '').toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCEEDED':
    case 'PAID':
      return 'paid';
    case 'ACTIVE':
    case 'PENDING':
      return 'pending';
    case 'EXPIRED':
      return 'expired';
    case 'INACTIVE':
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

export const xenditAdapter: PGAdapter = {
  provider: 'xendit',

  async createQris(args: CreateQrisArgs, creds: PGRuntimeCreds): Promise<QrisResult> {
    const base = ENDPOINTS[creds.mode];
    const body = {
      reference_id: args.orderId,
      type: 'DYNAMIC',
      currency: 'IDR',
      amount: Math.round(args.amount),
    };
    const res = await httpJson<XenditQrResp>(`${base}/qr_codes`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(creds.secret, ''),
        'Content-Type': 'application/json',
        'api-version': '2022-07-31',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.data?.qr_string) {
      const msg = res.data?.message ?? `HTTP ${res.status}`;
      throw new Error(`Xendit createQris gagal: ${msg}`);
    }
    return {
      qr_string: res.data.qr_string,
      external_id: res.data.id ?? args.orderId,
      expires_at: res.data.expires_at ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },

  async checkStatus(externalId: string, creds: PGRuntimeCreds): Promise<PaymentStatus> {
    const base = ENDPOINTS[creds.mode];
    const res = await httpJson<XenditQrResp>(`${base}/qr_codes/${encodeURIComponent(externalId)}`, {
      method: 'GET',
      headers: {
        Authorization: basicAuth(creds.secret, ''),
        'api-version': '2022-07-31',
      },
    });
    if (!res.ok) {
      // Jangan langsung 'failed' untuk error transient (rate limit/jaringan).
      if (res.status === 429 || res.status >= 500) return 'pending';
      return 'failed';
    }
    return mapStatus(res.data?.status);
  },

  async testConnection(creds: PGRuntimeCreds): Promise<TestResult> {
    const base = ENDPOINTS[creds.mode];
    // Endpoint ringan untuk validasi kredensial.
    const res = await httpJson(`${base}/balance`, {
      method: 'GET',
      headers: { Authorization: basicAuth(creds.secret, '') },
    });
    if (res.ok) return { ok: true, pesan: 'Kredensial Xendit valid.' };
    if (res.status === 401 || res.status === 403)
      return { ok: false, pesan: 'Secret Key Xendit ditolak (401/403). Periksa key & mode.' };
    return { ok: false, pesan: `Gagal menghubungi Xendit (HTTP ${res.status}).` };
  },
};
