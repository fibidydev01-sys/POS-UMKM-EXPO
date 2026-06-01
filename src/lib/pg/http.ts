/**
 * http.ts — pembungkus fetch untuk panggilan PG.
 *
 * - timeout (AbortController) supaya polling tidak menggantung.
 * - tidak pernah melog header Authorization / body yang memuat secret.
 * - RN fetch bebas CORS (keunggulan mobile, doc 01 §4).
 */

export interface HttpResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  raw: string;
}

const DEFAULT_TIMEOUT = 15000;

export async function httpJson<T = unknown>(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<HttpResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const raw = await res.text();
    let data: T | null = null;
    try {
      data = raw ? (JSON.parse(raw) as T) : null;
    } catch {
      data = null; // biarkan caller memutuskan
    }
    return { ok: res.ok, status: res.status, data, raw };
  } finally {
    clearTimeout(timer);
  }
}

/** Basic auth header dari "user:pass" (atau "secret:") → base64. */
export function basicAuth(user: string, pass = ''): string {
  // btoa tersedia di Hermes RN modern; fallback Buffer bila perlu.
  const token = `${user}:${pass}`;
  const b64 =
    typeof btoa === 'function'
      ? btoa(token)
      : // eslint-disable-next-line @typescript-eslint/no-var-requires
        Buffer.from(token, 'utf-8').toString('base64');
  return `Basic ${b64}`;
}
