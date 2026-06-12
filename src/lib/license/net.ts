/**
 * net.ts — jaringan MANDIRI untuk modul lisensi.
 *
 * Sengaja memakai `fetch` global (selalu ada di React Native) + AbortController
 * untuk timeout, AGAR TIDAK bergantung pada util HTTP proyek (yang signature-nya
 * bisa berbeda). Ini jalur kritis (aktivasi/verifikasi), jadi dibuat tanpa asumsi
 * eksternal.
 */

/** Base URL Edge Functions. Prioritas: DEV_SERVER (override) → SUPABASE_URL. */
export function functionsBase(): string {
  const override = (process.env.EXPO_PUBLIC_DEV_SERVER ?? '').replace(/\/+$/, '');
  if (override) return override;
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return url ? `${url}/functions/v1` : '';
}

/** Header standar Supabase: apikey + Authorization Bearer <ANON_KEY>. */
export function anonHeaders(): Record<string, string> {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (key) {
    h.apikey = key;
    h.Authorization = `Bearer ${key}`;
  }
  return h;
}

export interface PostResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

/**
 * POST JSON dengan timeout. Melempar hanya bila jaringan gagal/abort (pemanggil
 * menangani dgn try/catch). Non-2xx tetap dikembalikan sebagai { ok:false }.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs = 20000
): Promise<PostResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null; // respons bukan JSON / kosong
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}
