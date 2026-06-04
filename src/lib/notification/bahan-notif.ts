/**
 * bahan-notif.ts — notifikasi OS terkait stok BAHAN (migration v4).
 *
 * Sejajar dengan stock-notif.ts (untuk PRODUK), tapi membaca tabel bahan.
 *
 * checkAndNotifyLowStockBahan(bahanId): dipanggil SETELAH mutasi bahan
 * (konsumsi penjualan/restock/opname). Bila bahan habis (≤0) atau menipis
 * (≤ min_stock) → notif channel 'stock-alert'. Menghormati master switch.
 *
 * notifyOpnameSelisihBahan(nama, satuan, selisih): info ringan saat opname bahan
 * berbeda dari catatan (selisih ≠ 0).
 *
 * EXPO GO SAFE: expo-notifications lewat loadNotifications() (lazy). Di Expo Go
 * modul null → no-op; app tetap boot. Lihat notif-module.ts.
 */
import { loadNotifications } from './notif-module';
import { CHANNEL_ALERT, CHANNEL_INFO } from './channels';
import { getNotifSettings } from './settings';
import { getBahanById } from '../db/bahan';

async function notifAktif(): Promise<boolean> {
  try {
    const s = await getNotifSettings();
    return s.enabled;
  } catch {
    return false;
  }
}

/** Rapikan angka REAL: buang desimal nol berlebih (150.0 → "150", 0.5 → "0.5"). */
function fmtQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

async function kirim(title: string, body: string, channelId: string): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, data: { target: 'stok' } },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + 200, // ~seketika, tetap bisa membawa channelId
        channelId,
      },
    });
  } catch {
    // best-effort
  }
}

/** Cek stok satu bahan & kirim notif bila menipis/habis. Tidak melempar. */
export async function checkAndNotifyLowStockBahan(bahanId: number): Promise<void> {
  try {
    if (!(await notifAktif())) return;
    const b = await getBahanById(bahanId);
    if (!b) return;

    if (b.stok <= 0) {
      await kirim(
        'Bahan habis',
        `"${b.nama}" sudah habis (${fmtQty(b.stok)} ${b.satuan}). Segera restock.`,
        CHANNEL_ALERT
      );
      return;
    }
    if (b.stok <= b.min_stock) {
      await kirim(
        'Bahan menipis',
        `"${b.nama}" tersisa ${fmtQty(b.stok)} ${b.satuan} (min ${fmtQty(b.min_stock)}). Saatnya belanja.`,
        CHANNEL_ALERT
      );
    }
  } catch {
    // best-effort
  }
}

/** Info hasil opname bahan bila berbeda dari catatan. Tidak kirim bila selisih 0. */
export async function notifyOpnameSelisihBahan(
  nama: string,
  satuan: string,
  selisih: number
): Promise<void> {
  try {
    if (selisih === 0) return;
    if (!(await notifAktif())) return;
    const arah = selisih > 0 ? `lebih ${fmtQty(selisih)}` : `kurang ${fmtQty(Math.abs(selisih))}`;
    await kirim(
      'Selisih opname bahan',
      `Stok "${nama}" ${arah} ${satuan} dari catatan. Sudah disesuaikan.`,
      CHANNEL_INFO
    );
  } catch {
    // best-effort
  }
}
