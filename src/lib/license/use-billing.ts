/**
 * use-billing.ts — hook React pembungkus `expo-iap` (Google Play Billing).
 *
 * Beli sukses → kind='paid' → semua fitur aktif.
 *
 * onSukses dipanggil setelah unlock berhasil.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadIap, billingTersedia } from './iap-module';
import { verifikasiPembelian } from './billing-verify';
import { paymentEnabled } from '../config/staging-flags';

export const PRODUCT_IDS = ['pos_umkm_v1'] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export interface ProdukBilling {
  id: string;
  judul: string;
  harga: string;
}

export interface BillingState {
  tersedia: boolean;
  terhubung: boolean;
  produk: ProdukBilling[];
  proses: boolean;
  error: string | null;
  beli: (productId: string) => Promise<void>;
  pulihkan: () => Promise<void>;
}

export interface UseBillingOpts {
  /** Dipanggil setelah pembelian terverifikasi server & lisensi tersimpan. */
  onSukses?: () => void;
}

const IAP = loadIap();
const IAP_AVAILABLE = billingTersedia();
const PAYMENT_ON = paymentEnabled();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ekstrakToken(p: any): string | null {
  if (!p) return null;
  if (typeof p.purchaseToken === 'string') return p.purchaseToken;
  if (typeof p.purchaseTokenAndroid === 'string') return p.purchaseTokenAndroid;
  if (typeof p.transactionReceipt === 'string') {
    try {
      const o = JSON.parse(p.transactionReceipt);
      if (typeof o.purchaseToken === 'string') return o.purchaseToken;
    } catch { /* bukan JSON */ }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ekstrakProductId(p: any): string | null {
  if (!p) return null;
  if (typeof p.productId === 'string') return p.productId;
  if (typeof p.id === 'string') return p.id;
  if (Array.isArray(p.productIds) && typeof p.productIds[0] === 'string') return p.productIds[0];
  if (Array.isArray(p.products) && typeof p.products[0] === 'string') return p.products[0];
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalisasiProduk(raw: any[]): ProdukBilling[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    id:    String(p.id ?? p.productId ?? ''),
    judul: String(p.title ?? p.name ?? p.id ?? p.productId ?? 'POS UMKM Pro'),
    harga: String(p.displayPrice ?? p.localizedPrice ?? p.price ?? ''),
  })).filter((p) => p.id);
}

function useBillingReal(opts: UseBillingOpts): BillingState {
  const onSuksesRef = useRef(opts.onSukses);
  onSuksesRef.current = opts.onSukses;

  const [proses, setProses] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const iap = IAP!.useIAP({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPurchaseSuccess: (purchase: any) => { void handleSukses(purchase); },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPurchaseError: (e: any) => {
      const code = e?.code ?? '';
      if (String(code).toLowerCase().includes('cancel')) { setProses(false); return; }
      setError(e?.message ?? 'Pembelian gagal.');
      setProses(false);
    },
  });

  const finishAman = useCallback(async (purchase: unknown): Promise<void> => {
    try {
      await iap.finishTransaction({ purchase, isConsumable: false });
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (iap.finishTransaction as any)(purchase, false);
      } catch {
        setError('Lisensi aktif. Jika tidak langsung terbuka, tap "Pulihkan pembelian".');
      }
    }
  }, [iap]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSukses = useCallback(async (purchase: any) => {
    const token     = ekstrakToken(purchase);
    const productId = ekstrakProductId(purchase);
    if (!token || !productId) {
      setError('Data pembelian tidak terbaca. Coba pulihkan pembelian.');
      setProses(false);
      return;
    }
    const v = await verifikasiPembelian({ productId, purchaseToken: token });
    if (!v.ok) {
      setError(
        `${v.pesan}\n\nPembelian Anda tercatat di Google Play — tap "Pulihkan pembelian" untuk melanjutkan.`
      );
      setProses(false);
      return;
    }
    await finishAman(purchase);
    setProses(false);
    setError(null);
    onSuksesRef.current?.();
  }, [finishAman]);

  useEffect(() => {
    if (!iap?.connected) return;
    void (async () => {
      try {
        await iap.fetchProducts({ skus: [...PRODUCT_IDS], type: 'in-app' });
      } catch {
        try { await iap.fetchProducts({ skus: [...PRODUCT_IDS] }); } catch { /* */ }
      }
    })();
  }, [iap?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const beli = useCallback(async (productId: string) => {
    setError(null);
    setProses(true);
    try {
      await iap.requestPurchase({
        request: { ios: { sku: productId }, android: { skus: [productId] } },
        type: 'in-app',
      });
    } catch {
      try {
        await iap.requestPurchase({
          request: { apple: { sku: productId }, google: { skus: [productId] } },
          type: 'in-app',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tidak bisa memulai pembelian.');
        setProses(false);
      }
    }
  }, [iap]);

  const pulihkan = useCallback(async () => {
    setError(null);
    setProses(true);
    try {
      let owned: unknown[] = [];
      try {
        owned = (await iap.getAvailablePurchases?.()) ?? iap.availablePurchases ?? [];
      } catch {
        owned = iap.availablePurchases ?? [];
      }
      const match = (owned as unknown[]).find((p) => {
        const id = ekstrakProductId(p);
        return id && (PRODUCT_IDS as readonly string[]).includes(id);
      });
      if (!match) { setError('Tidak ada pembelian untuk dipulihkan.'); setProses(false); return; }
      await handleSukses(match);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memulihkan pembelian.');
      setProses(false);
    }
  }, [iap, handleSukses]);

  return {
    tersedia: true,
    terhubung: !!iap?.connected,
    produk: normalisasiProduk(iap?.products ?? []),
    proses,
    error,
    beli,
    pulihkan,
  };
}

function useBillingNoop(): BillingState {
  const noop = useCallback(async () => { }, []);
  return {
    tersedia: false,
    terhubung: false,
    produk: [],
    proses: false,
    error: null,
    beli: noop,
    pulihkan: noop,
  };
}

export function useBilling(opts: UseBillingOpts = {}): BillingState {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return IAP_AVAILABLE && PAYMENT_ON ? useBillingReal(opts) : useBillingNoop();
}
