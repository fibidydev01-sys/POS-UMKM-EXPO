/**
 * stock-notif.ts — notifikasi OS terkait stok PRODUK (SDK 56).
 *
 * checkAndNotifyLowStock(menuId): dipanggil SETELAH mutasi stok produk
 * (penjualan/restock/opname). Bila habis (≤0) atau menipis (≤ min_stock) →
 * notif channel 'stock-alert'. Menghormati master switch (enabled).
 *
 * notifyOpnameSelisih(nama, selisih): info ringan saat opname berbeda dari catatan.
 *
 * EXPO GO SAFE: expo-notifications lewat loadNotifications() (lazy). Di Expo Go
 * modul null → no-op; app tetap boot. Lihat notif-module.ts.
 *
 * Semua best-effort: menelan error agar TIDAK mengganggu alur transaksi.
 * data.target='stok' dipakai _layout untuk deep-link tap → tab Beranda.
 */
import { loadNotifications } from './notif-module';
import { CHANNEL_ALERT, CHANNEL_INFO } from './channels';
import { getNotifSettings } from './settings';
import { getMenuById } from '../db/menu';

async function notifAktif(): Promise<boolean> {
  try {
    const s = await getNotifSettings();
    return s.enabled;
  } catch {
    return false;
  }
}

async function kirim(title: string, body: string, channelId: string): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  try {
    // Notif "seketika" tapi tetap menargetkan channel tertentu (penting agar
    // stok-alert dapat importance HIGH di Android). Trigger DATE ~sekarang adalah
    // cara TYPED & valid di SDK 56 untuk membawa channelId (trigger:null tidak bisa).
    await N.scheduleNotificationAsync({
      content: { title, body, data: { target: 'stok' } },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: Date.now() + 200,
        channelId,
      },
    });
  } catch {
    // best-effort
  }
}

/** Cek stok satu produk & kirim notif bila menipis/habis. Tidak melempar. */
export async function checkAndNotifyLowStock(menuId: number): Promise<void> {
  try {
    if (!(await notifAktif())) return;
    const item = await getMenuById(menuId);
    if (!item) return;

    if (item.stok <= 0) {
      await kirim(
        'Stok habis',
        `"${item.nama}" sudah habis. Segera restock agar tetap bisa dijual.`,
        CHANNEL_ALERT
      );
      return;
    }
    if (item.stok <= item.min_stock) {
      await kirim(
        'Stok menipis',
        `"${item.nama}" tersisa ${item.stok} (min ${item.min_stock}). Saatnya belanja.`,
        CHANNEL_ALERT
      );
    }
  } catch {
    // best-effort
  }
}

/** Info hasil opname bila berbeda dari catatan sistem. Tidak kirim bila selisih 0. */
export async function notifyOpnameSelisih(nama: string, selisih: number): Promise<void> {
  try {
    if (selisih === 0) return;
    if (!(await notifAktif())) return;
    const arah = selisih > 0 ? `lebih ${selisih}` : `kurang ${Math.abs(selisih)}`;
    await kirim(
      'Selisih opname tercatat',
      `Stok "${nama}" ${arah} dari catatan sistem. Sudah disesuaikan.`,
      CHANNEL_INFO
    );
  } catch {
    // best-effort
  }
}
