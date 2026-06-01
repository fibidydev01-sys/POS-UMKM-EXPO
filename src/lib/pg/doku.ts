/**
 * doku.ts — adapter DOKU SNAP QRIS MPM (Phase 3).
 *
 * Tiga langkah:
 *   1. B2B access token  — tanda tangan ASIMETRIS RSA-SHA256 atas "{clientId}|{timestamp}".
 *   2. Generate QRIS     — tanda tangan SIMETRIS HMAC-SHA512 (service signature).
 *   3. Inquiry status    — untuk polling.
 *
 * Kredensial (3 rahasia):
 *   - apiKey = "ClientId:ClientSecret"  → creds.secret (dipecah di sini)
 *   - RSA private key PEM               → creds.rsaPrivateKey
 *
 * ⚠️ DETAIL YANG WAJIB DIVERIFIKASI DI SANDBOX DOKU (doc 02 Phase 3, risiko tinggi):
 *     - Path endpoint persis (bisa berubah per versi SNAP).
 *     - Header X-PARTNER-ID / CHANNEL-ID / X-EXTERNAL-ID yang diminta akun Anda.
 *     - Format MINIFY body (harus byte-identik dengan yang di-hash).
 *     - Offset timestamp WIB +07:00.
 *     - merchantId & terminalId milik akun.
 *   Konstanta di bawah memakai jalur SNAP umum; sesuaikan dgn dokumen sandbox Anda.
 */
import type {
  PGAdapter, CreateQrisArgs, QrisResult, PaymentStatus, TestResult, PGRuntimeCreds, ProviderEndpoints,
} from './types';
import { httpJson } from './http';
import {
  sha256Hex, hmacSha512Base64, rsaSha256SignBase64, timestampWIB, minifyJson, uuid,
} from './crypto-doku';

const ENDPOINTS: ProviderEndpoints = {
  sandbox: 'https://api-sandbox.doku.com',
  production: 'https://api.doku.com',
};

// Path SNAP — VERIFIKASI dengan dokumen akun sandbox Anda.
const PATH_TOKEN = '/authorization/v1/access-token/b2b';
const PATH_QRIS = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
const PATH_INQUIRY = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

function splitApiKey(secret: string): { clientId: string; clientSecret: string } {
  const idx = secret.indexOf(':');
  if (idx < 0) throw new Error('apiKey DOKU harus berformat "ClientId:ClientSecret".');
  return { clientId: secret.slice(0, idx), clientSecret: secret.slice(idx + 1) };
}

interface TokenResp {
  accessToken?: string;
  responseCode?: string;
  responseMessage?: string;
}

async function ambilToken(creds: PGRuntimeCreds): Promise<string> {
  if (!creds.rsaPrivateKey) throw new Error('RSA private key DOKU belum diset.');
  const { clientId } = splitApiKey(creds.secret);
  const base = ENDPOINTS[creds.mode];
  const ts = timestampWIB();
  const stringToSign = `${clientId}|${ts}`;
  const signature = rsaSha256SignBase64(stringToSign, creds.rsaPrivateKey);

  const body = { grantType: 'client_credentials' };
  const res = await httpJson<TokenResp>(`${base}${PATH_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SIGNATURE': signature,
      'X-TIMESTAMP': ts,
      'X-CLIENT-KEY': clientId,
    },
    body: minifyJson(body),
  });
  if (!res.ok || !res.data?.accessToken) {
    const msg = res.data?.responseMessage ?? `HTTP ${res.status}`;
    throw new Error(`DOKU token gagal: ${msg}`);
  }
  return res.data.accessToken;
}

/** Service signature HMAC-SHA512 untuk request SNAP setelah punya token. */
function serviceSignature(
  method: string,
  path: string,
  token: string,
  bodyMinified: string,
  ts: string,
  clientSecret: string
): string {
  const bodyHash = sha256Hex(bodyMinified);
  const stringToSign = `${method}:${path}:${token}:${bodyHash}:${ts}`;
  return hmacSha512Base64(stringToSign, clientSecret);
}

interface QrisGenResp {
  qrContent?: string;
  responseCode?: string;
  responseMessage?: string;
  validityPeriod?: string;
  referenceNo?: string;
}

interface QrisQueryResp {
  responseCode?: string;
  responseMessage?: string;
  transactionStatusDesc?: string; // mis. SUCCESS / PENDING / EXPIRED
  latestTransactionStatus?: string; // kode: 00 success, 01 pending, dst
}

function mapStatus(desc?: string, code?: string): PaymentStatus {
  const d = (desc ?? '').toUpperCase();
  const c = code ?? '';
  if (c === '00' || d.includes('SUCCESS') || d.includes('PAID')) return 'paid';
  if (c === '03' || d.includes('PENDING') || d.includes('PROCESS')) return 'pending';
  if (d.includes('EXPIR')) return 'expired';
  if (c === '05' || c === '06' || c === '07' || d.includes('FAIL') || d.includes('CANCEL'))
    return 'failed';
  return 'pending';
}

export const dokuAdapter: PGAdapter = {
  provider: 'doku',

  async createQris(args: CreateQrisArgs, creds: PGRuntimeCreds): Promise<QrisResult> {
    const { clientId, clientSecret } = splitApiKey(creds.secret);
    const base = ENDPOINTS[creds.mode];
    const token = await ambilToken(creds);
    const ts = timestampWIB();
    const externalId = uuid();

    const body = {
      partnerReferenceNo: args.orderId,
      amount: { value: `${Math.round(args.amount)}.00`, currency: 'IDR' },
      merchantId: clientId, // VERIFIKASI: sebagian akun pakai merchantId terpisah.
      validityPeriod: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const bodyStr = minifyJson(body);
    const sig = serviceSignature('POST', PATH_QRIS, token, bodyStr, ts, clientSecret);

    const res = await httpJson<QrisGenResp>(`${base}${PATH_QRIS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-TIMESTAMP': ts,
        'X-SIGNATURE': sig,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'POSUMKM',
      },
      body: bodyStr,
    });

    if (!res.ok || !res.data?.qrContent) {
      const msg = res.data?.responseMessage ?? `HTTP ${res.status}`;
      throw new Error(`DOKU generate QRIS gagal: ${msg}`);
    }
    return {
      qr_string: res.data.qrContent,
      external_id: res.data.referenceNo ?? args.orderId,
      expires_at: res.data.validityPeriod ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },

  async checkStatus(externalId: string, creds: PGRuntimeCreds): Promise<PaymentStatus> {
    const { clientId, clientSecret } = splitApiKey(creds.secret);
    const base = ENDPOINTS[creds.mode];
    let token: string;
    try {
      token = await ambilToken(creds);
    } catch {
      return 'pending'; // token transient gagal → coba lagi siklus berikutnya
    }
    const ts = timestampWIB();
    const reqId = uuid();
    const body = {
      originalPartnerReferenceNo: externalId,
      serviceCode: '47',
    };
    const bodyStr = minifyJson(body);
    const sig = serviceSignature('POST', PATH_INQUIRY, token, bodyStr, ts, clientSecret);

    const res = await httpJson<QrisQueryResp>(`${base}${PATH_INQUIRY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-TIMESTAMP': ts,
        'X-SIGNATURE': sig,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': reqId,
        'CHANNEL-ID': 'POSUMKM',
      },
      body: bodyStr,
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) return 'pending';
      return 'failed';
    }
    return mapStatus(res.data?.transactionStatusDesc, res.data?.latestTransactionStatus);
  },

  async testConnection(creds: PGRuntimeCreds): Promise<TestResult> {
    try {
      splitApiKey(creds.secret);
      if (!creds.rsaPrivateKey) return { ok: false, pesan: 'RSA private key DOKU belum diisi.' };
      await ambilToken(creds);
      return { ok: true, pesan: 'Token DOKU berhasil diambil. Kredensial valid.' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tidak diketahui';
      return { ok: false, pesan: `Gagal: ${msg}` };
    }
  },
};
