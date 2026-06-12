/**
 * struk.ts — render teks struk (monospace) + cetak ke printer thermal Bluetooth.
 *
 * Cetak memakai react-native-thermal-printer JIKA tersedia (hanya di
 * build Android dengan modul native). Di Expo Go / iOS / web, printerTersedia()
 * mengembalikan false dan UI menampilkan pesan ramah — tanpa crash.
 *
 * renderStrukText murni (tanpa native) sehingga preview struk selalu jalan.
 *
 * PERBAIKAN HEADER STRUK:
 *   - Nomor order ditaruh di baris sendiri (kiri), waktu di bawahnya.
 *   - Tidak ada lagi pemanggilan kiriKanan(..,'',..) yang menghasilkan baris
 *     setengah-jadi / trailing space aneh.
 *   - Field config memakai nama yang benar: nama_umkm, no_telp, paper_width.
 *
 * PERUBAHAN PRINTER:
 *   - Ganti react-native-bluetooth-escpos-printer → react-native-thermal-printer.
 *   - API baru: getBluetoothDeviceList + printBluetooth (tidak perlu connect eksplisit).
 *   - Signature getPairedDevices / connectPrinter / cetakStruk TIDAK BERUBAH
 *     sehingga pemanggil lama tetap kompatibel.
 *
 * PERUBAHAN (FINISHING / UX AUDIT A2):
 *   - cetakStrukKePrinter(): satu fungsi tunggal untuk seluruh flow cetak —
 *     ambil device list SEKALI, cetak ke device pertama, dan KEMBALIKAN NAMA
 *     PRINTER agar UI bisa menampilkannya ("Struk terkirim ke RPP02N").
 *     Menggantikan ritual getPairedDevices→connectPrinter→cetakStruk yang
 *     dulu diduplikasi di kasir.tsx & use-riwayat.ts (dan getBluetoothDeviceList
 *     dipanggil dua kali per cetak).
 *   - Pesan error "printer tidak ditemukan" kini menyebut kemungkinan
 *     BLUETOOTH MATI — sebelumnya menyesatkan (user BT off dibilang
 *     "printer tidak ditemukan" tanpa petunjuk).
 */
import { Platform } from 'react-native';
import type { UmkmConfig, Transaksi, TransactionItem } from '../db/database';
import { formatRupiah } from '../utils/currency';
import { formatTanggalJam } from '../utils/date';

const PAYMENT_LABEL: Record<string, string> = {
  tunai: 'TUNAI', qris: 'QRIS', transfer: 'TRANSFER', debit: 'DEBIT',
};

/** Lebar kolom efektif untuk kertas 58mm (32) / 80mm (48). */
function kolom(paperWidth: number): number {
  return paperWidth >= 80 ? 48 : 32;
}

function garis(w: number): string { return '-'.repeat(w); }

function tengah(teks: string, w: number): string {
  if (teks.length >= w) return teks.slice(0, w);
  const kiri = Math.floor((w - teks.length) / 2);
  return ' '.repeat(kiri) + teks;
}

/** Nama di kiri, harga di kanan, dipisah spasi sesuai lebar kolom. */
function kiriKanan(kiri: string, kanan: string, w: number): string {
  const ruang = w - kiri.length - kanan.length;
  if (ruang < 1) {
    const potong = kiri.slice(0, Math.max(0, w - kanan.length - 1));
    return `${potong} ${kanan}`;
  }
  return kiri + ' '.repeat(ruang) + kanan;
}

// ── Helper kalkulasi font untuk tampilan on-screen ──────────────────────────

export interface StrukFontMetrics {
  /** Font size optimal agar baris terpanjang tidak wrap di layar. */
  fontSize: number;
  /** Line height yang proporsional dengan fontSize. */
  lineHeight: number;
  /** Jumlah kolom karakter (32 untuk 58mm, 48 untuk 80mm). */
  cols: number;
}

/**
 * Hitung font size optimal untuk menampilkan struk monospace di layar.
 *
 * Logika:
 *   - Karakter monospace (Menlo/DroidSansMono) punya rasio lebar ≈ 0.62× fontSize.
 *   - Kita perlu `cols` karakter × lebar_per_char ≤ availableWidth.
 *   - fontSize = floor(availableWidth / (cols × 0.62)), di-clamp ke [8, 13].
 */
export function hitungStrukFont(paperWidth: number, availableWidth: number): StrukFontMetrics {
  const cols = kolom(paperWidth);
  const CHAR_RATIO = 0.62; // lebar karakter monospace relatif terhadap fontSize
  const ideal = Math.floor(availableWidth / (cols * CHAR_RATIO));
  const fontSize = Math.max(8, Math.min(13, ideal));
  const lineHeight = Math.round(fontSize * 1.55); // ≈ 1.55 line-height standar monospace
  return { fontSize, lineHeight, cols };
}

// ── Render teks struk ────────────────────────────────────────────────────────

/** Render struk sebagai teks polos siap tampil / kirim ke printer ESC/POS. */
export function renderStrukText(config: UmkmConfig, trx: Transaksi, items: TransactionItem[]): string {
  const w = kolom(config.paper_width ?? 58);
  const L: string[] = [];

  // ── Header toko (semua di tengah) ──
  L.push(tengah((config.nama_umkm || 'WARUNG').toUpperCase(), w));
  if (config.alamat) L.push(tengah(config.alamat, w));
  if (config.no_telp) L.push(tengah(config.no_telp, w));
  L.push(garis(w));

  // ── Info transaksi (kiri) ──
  L.push(trx.nomor_order);
  L.push(formatTanggalJam(trx.created_at));
  if (trx.status !== 'completed') {
    L.push('');
    L.push(tengah(`*** ${trx.status.toUpperCase()} ***`, w));
  }
  L.push(garis(w));

  // ── Item ──
  for (const it of items) {
    const gratis = it.item_type === 'promo_free';
    L.push(it.nama_produk);
    const kiri = `  ${it.qty} x ${formatRupiah(it.harga_satuan)}`;
    const kanan = gratis ? 'GRATIS' : formatRupiah(it.subtotal);
    L.push(kiriKanan(kiri, kanan, w));
  }

  L.push(garis(w));
  L.push(kiriKanan('Subtotal', formatRupiah(trx.subtotal), w));
  if (trx.diskon_nominal > 0) {
    L.push(kiriKanan(`Diskon ${trx.diskon_persen}%`, `-${formatRupiah(trx.diskon_nominal)}`, w));
  }
  L.push(kiriKanan('TOTAL', formatRupiah(trx.grand_total), w));

  const label = PAYMENT_LABEL[trx.payment_method] ?? trx.payment_method.toUpperCase();
  L.push(kiriKanan('Bayar', label, w));
  if (trx.uang_diterima != null) {
    L.push(kiriKanan('Tunai', formatRupiah(trx.uang_diterima), w));
    if (trx.kembalian != null) {
      L.push(kiriKanan('Kembali', formatRupiah(trx.kembalian), w));
    }
  }

  L.push(garis(w));
  if (config.footer_struk) {
    config.footer_struk.split('\n').forEach((baris) => L.push(tengah(baris, w)));
  }
  L.push('');
  return L.join('\n');
}

// ───────────────────────── Printer (opsional/native) ─────────────────────────

type ThermalModule = {
  printBluetooth: (args: { payload: string; macAddress?: string }) => Promise<void>;
  getBluetoothDeviceList: () => Promise<{ deviceName: string; macAddress: string }[]>;
};

let _mod: ThermalModule | null | undefined;

function loadModule(): ThermalModule | null {
  if (_mod !== undefined) return _mod;
  try {
    // require dinamis: jika modul native tidak ada, masuk catch.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    _mod = require('react-native-thermal-printer') as ThermalModule;
  } catch {
    _mod = null;
  }
  return _mod;
}

/** Apakah cetak fisik tersedia di environment ini? */
export function printerTersedia(): boolean {
  return Platform.OS === 'android' && loadModule() != null;
}

/** Daftar perangkat Bluetooth terpasang (paired). */
export async function getPairedDevices(): Promise<{ name: string; address: string }[]> {
  const mod = loadModule();
  if (!mod) return [];
  try {
    const list = await mod.getBluetoothDeviceList();
    return list.map((d) => ({ name: d.deviceName, address: d.macAddress }));
  } catch {
    return [];
  }
}

/**
 * react-native-thermal-printer tidak butuh connect eksplisit —
 * address dikirim langsung saat printBluetooth. Fungsi ini tetap ada
 * agar pemanggil lama tidak perlu diubah.
 */
export async function connectPrinter(_address: string): Promise<boolean> {
  return loadModule() != null;
}

/** Pesan error standar — disebut di dua tempat, jangan sampai beda redaksi. */
const PESAN_TIDAK_TERSEDIA =
  'Cetak struk hanya tersedia di build Android dengan printer Bluetooth.';
const PESAN_TIDAK_DITEMUKAN =
  'Printer tidak ditemukan. Pastikan Bluetooth HP MENYALA dan printer thermal sudah di-pair di Pengaturan Bluetooth.';
const PESAN_GAGAL =
  'Gagal mencetak. Pastikan Bluetooth menyala, printer hidup & dalam jangkauan, lalu coba lagi.';

export interface HasilCetak {
  ok: boolean;
  pesan: string;
  /** Nama printer tujuan — tampilkan ke user agar tahu printer mana yang dipakai. */
  printerName?: string;
}

/**
 * SATU PINTU flow cetak: cek modul → ambil device list SEKALI → cetak ke
 * device pertama → kembalikan nama printer. Pemanggil tinggal:
 *
 *   if (!printerTersedia()) { Alert ... ; return; }
 *   const res = await cetakStrukKePrinter(config, trx, items);
 *   res.ok ? toast.success(res.pesan) : Alert.alert('Gagal cetak', res.pesan);
 */
export async function cetakStrukKePrinter(
  config: UmkmConfig,
  trx: Transaksi,
  items: TransactionItem[]
): Promise<HasilCetak> {
  const mod = loadModule();
  if (!mod) return { ok: false, pesan: PESAN_TIDAK_TERSEDIA };
  try {
    const devices = await mod.getBluetoothDeviceList();
    if (devices.length === 0) {
      return { ok: false, pesan: PESAN_TIDAK_DITEMUKAN };
    }
    const tujuan = devices[0];
    const teks = renderStrukText(config, trx, items);
    await mod.printBluetooth({
      payload: teks + '\n\n\n',
      macAddress: tujuan.macAddress,
    });
    return {
      ok: true,
      pesan: `Struk terkirim ke ${tujuan.deviceName || 'printer'}.`,
      printerName: tujuan.deviceName,
    };
  } catch {
    return { ok: false, pesan: PESAN_GAGAL };
  }
}

/**
 * @deprecated Pakai cetakStrukKePrinter() — sudah termasuk pencarian device
 * dan mengembalikan nama printer. Fungsi ini dipertahankan untuk kompatibilitas.
 */
export async function cetakStruk(
  config: UmkmConfig,
  trx: Transaksi,
  items: TransactionItem[]
): Promise<{ ok: boolean; pesan: string }> {
  const res = await cetakStrukKePrinter(config, trx, items);
  return { ok: res.ok, pesan: res.pesan };
}
