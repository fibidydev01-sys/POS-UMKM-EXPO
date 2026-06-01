/**
 * midtrans.ts — adapter Midtrans Core API (Phase 1).
 *
 * Auth: Basic, username = Server Key, password kosong.
 * createQris : POST /v2/charge  (payment_type "qris", acquirer "gopay")
 * checkStatus: GET  /v2/{order_id}/status → map transaction_status
 *
 * Base URL beda untuk sandbox vs production.
 * Verifikasi acquirer & field qr_string di akun sandbox Anda (doc 02 Phase 1).
 */
import type {
  PGAdapter, CreateQrisArgs, QrisResult, PaymentStatus, TestResult, PGRuntimeCreds, ProviderEndpoints,
} from './types';
import { httpJson, basicAuth } from './http';

const ENDPOINTS: ProviderEndpoints = {
  sandbox: 'https://api.sandbox.midtrans.com',
  production: 'https://api.midtrans.com',
};

interface MidtransAction {
  name?: string;
  url?: string;
}
interface MidtransChargeResp {
  transaction_id?: string;
  order_id?: string;
  transaction_status?: string;
  status_code?: string;
  status_message?: string;
  qr_string?: string;
  expiry_time?: string;
  actions?: MidtransAction[];
}

function mapStatus(s?: string): PaymentStatus {
  switch ((s ?? '').toLowerCase()) {
    case 'settlement':
    case 'capture':
      return 'paid';
    case 'pending':
      return 'pending';
    case 'expire':
      return 'expired';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'failed';
    default:
      return 'pending';
  }
}

export const midtransAdapter: PGAdapter = {
  provider: 'midtrans',

  async createQris(args: CreateQrisArgs, creds: PGRuntimeCreds): Promise<QrisResult> {
    const base = ENDPOINTS[creds.mode];
    const body = {
      payment_type: 'qris',
      transaction_details: {
        order_id: args.orderId,
        gross_amount: Math.round(args.amount),
      },
      qris: { acquirer: 'gopay' },
      item_details: [
        { id: 'ORDER', price: Math.round(args.amount), quantity: 1, name: args.label.slice(0, 50) },
      ],
    };
    const res = await httpJson<MidtransChargeResp>(`${base}/v2/charge`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(creds.secret, ''),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const qr = res.data?.qr_string;
    if (!res.ok || !qr) {
      const msg = res.data?.status_message ?? `HTTP ${res.status}`;
      throw new Error(`Midtrans createQris gagal: ${msg}`);
    }
    const qrUrl = res.data?.actions?.find((a) => a.name === 'generate-qr-code')?.url;
    return {
      qr_string: qr,
      qr_url: qrUrl,
      external_id: res.data?.order_id ?? args.orderId,
      expires_at: res.data?.expiry_time
        ? new Date(res.data.expiry_time.replace(' ', 'T')).toISOString()
        : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },

  async checkStatus(externalId: string, creds: PGRuntimeCreds): Promise<PaymentStatus> {
    const base = ENDPOINTS[creds.mode];
    const res = await httpJson<MidtransChargeResp>(
      `${base}/v2/${encodeURIComponent(externalId)}/status`,
      {
        method: 'GET',
        headers: { Authorization: basicAuth(creds.secret, ''), Accept: 'application/json' },
      }
    );
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) return 'pending';
      // 404 = transaksi belum terbentuk / order id beda → anggap pending sekali,
      // kecuali memang ditolak.
      if (res.status === 404) return 'pending';
      return 'failed';
    }
    return mapStatus(res.data?.transaction_status);
  },

  async testConnection(creds: PGRuntimeCreds): Promise<TestResult> {
    const base = ENDPOINTS[creds.mode];
    // Status atas order acak → 404 dgn auth valid; 401 bila key salah.
    const res = await httpJson(`${base}/v2/pos-umkm-test-conn/status`, {
      method: 'GET',
      headers: { Authorization: basicAuth(creds.secret, ''), Accept: 'application/json' },
    });
    if (res.status === 401)
      return { ok: false, pesan: 'Server Key Midtrans ditolak (401). Periksa key & mode.' };
    if (res.ok || res.status === 404)
      return { ok: true, pesan: 'Kredensial Midtrans valid.' };
    return { ok: false, pesan: `Gagal menghubungi Midtrans (HTTP ${res.status}).` };
  },
};
