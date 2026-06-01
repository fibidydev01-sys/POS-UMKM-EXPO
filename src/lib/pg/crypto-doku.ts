/**
 * crypto-doku.ts — primitif kripto untuk DOKU SNAP QRIS MPM (Phase 3).
 *
 * Jalur JS murni agar TETAP jalan di Expo Go:
 *   - SHA-256 & HMAC-SHA512: @noble/hashes (cepat, audited, JS murni).
 *   - RSA-SHA256 sign      : node-forge (JS murni).
 *
 * Jika butuh kecepatan lebih (RSA besar/volume tinggi), bisa diganti
 * react-native-quick-crypto (native) — TAPI itu butuh dev client/prebuild
 * (keluar dari Expo Go). Default di sini JS murni.
 *
 * ⚠️ Timestamp DOKU: ISO 8601 dengan offset WIB +07:00, contoh:
 *    2026-06-01T15:32:36+07:00
 *    Offset & format minify body WAJIB cocok dengan akun sandbox (doc 02 Phase 3).
 */
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';
import forge from 'node-forge';

/** bytes → hex lowercase. */
function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

/** bytes → base64. */
function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return typeof btoa === 'function'
    ? btoa(bin)
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
    Buffer.from(bin, 'binary').toString('base64');
}

const enc = new TextEncoder();

/** SHA-256 lowercase hex dari string (untuk komponen signature SNAP). */
export function sha256Hex(input: string): string {
  return toHex(sha256(enc.encode(input)));
}

/**
 * Minify JSON ala SNAP: hilangkan whitespace antar token.
 * DOKU menandatangani hash dari body yang sudah di-minify.
 */
export function minifyJson(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * HMAC-SHA512 → base64. Dipakai untuk tanda tangan SIMETRIS (service signature)
 * pada generate QRIS & inquiry.
 *
 * stringToSign khas SNAP:
 *   "{HTTPMethod}:{EndpointPath}:{AccessToken}:{sha256LowercaseHexBody}:{timestamp}"
 */
export function hmacSha512Base64(stringToSign: string, clientSecret: string): string {
  const mac = hmac(sha512, enc.encode(clientSecret), enc.encode(stringToSign));
  return toBase64(mac);
}

/**
 * RSA-SHA256 sign → base64. Dipakai untuk tanda tangan ASIMETRIS saat ambil
 * B2B access token. stringToSign khas SNAP: "{clientId}|{timestamp}".
 *
 * privateKeyPem: PKCS#8 / PKCS#1 PEM.
 */
export function rsaSha256SignBase64(stringToSign: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(stringToSign, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/** Timestamp ISO 8601 dengan offset tetap WIB +07:00 (DOKU SNAP). */
export function timestampWIB(date: Date = new Date()): string {
  // Geser ke WIB lalu format manual agar offset +07:00 eksplisit.
  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(wibMs);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  const yyyy = d.getUTCFullYear();
  const MM = p(d.getUTCMonth() + 1);
  const dd = p(d.getUTCDate());
  const HH = p(d.getUTCHours());
  const mm = p(d.getUTCMinutes());
  const ss = p(d.getUTCSeconds());
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}+07:00`;
}

/** UUID v4 sederhana (untuk externalId / X-EXTERNAL-ID). */
export function uuid(): string {
  // Tidak butuh kripto kuat untuk id eksternal.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
