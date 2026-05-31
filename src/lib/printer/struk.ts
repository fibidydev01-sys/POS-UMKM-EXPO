/**
 * struk.ts — render teks struk (monospace) + cetak ke printer thermal Bluetooth.
 *
 * Cetak memakai react-native-bluetooth-escpos-printer JIKA tersedia (hanya di
 * build Android dengan modul native). Di Expo Go / iOS / web, printerTersedia()
 * mengembalikan false dan UI menampilkan pesan ramah — tanpa crash.
 *
 * renderStrukText murni (tanpa native) sehingga preview struk selalu jalan.
 */
import { Platform } from 'react-native';
import { UmkmConfig, Transaksi, TransactionItem } from '../db/database';
import { formatRupiah } from '../utils/currency';
import { formatTanggalJam } from '../utils/date';

const PAYMENT_LABEL: Record<string, string> = {
  tunai: 'TUNAI', qris: 'QRIS', transfer: 'TRANSFER', debit: 'DEBIT',
};

interface HasilCetak { ok: boolean; pesan: string; }
interface PairedDevice { name: string; address: string; }

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

/** Render struk sebagai teks polos siap tampil / kirim ke printer ESC/POS. */
export function renderStrukText(config: UmkmConfig, trx: Transaksi, items: TransactionItem[]): string {
  const w = kolom(config.paper_width ?? 58);
  const L: string[] = [];

  L.push(tengah((config.nama_umkm || 'WARUNG').toUpperCase(), w));
  if (config.alamat) L.push(tengah(config.alamat, w));
  if (config.no_telp) L.push(tengah(config.no_telp, w));
  L.push(garis(w));
  L.push(kiriKanan(trx.nomor_order, '', w).trimEnd());
  L.push(formatTanggalJam(trx.created_at));
  if (trx.status !== 'completed') {
    L.push('');
    L.push(tengah(`*** ${trx.status.toUpperCase()} ***`, w));
  }
  L.push(garis(w));

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

type EscPosModule = {
  BluetoothManager: {
    isBluetoothEnabled: () => Promise<boolean>;
    enableBluetooth: () => Promise<string[]>;
    connect: (address: string) => Promise<void>;
  };
  BluetoothEscposPrinter: {
    printText: (text: string, opts?: Record<string, unknown>) => Promise<void>;
    printAndFeed?: (lines: number) => Promise<void>;
  };
};

let _mod: EscPosModule | null | undefined;

function loadModule(): EscPosModule | null {
  if (_mod !== undefined) return _mod;
  try {
    // require dinamis: jika modul native tidak ada, masuk catch.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _mod = require('react-native-bluetooth-escpos-printer') as EscPosModule;
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
export async function getPairedDevices(): Promise<PairedDevice[]> {
  const mod = loadModule();
  if (!mod) return [];
  try {
    const enabled = await mod.BluetoothManager.isBluetoothEnabled();
    if (!enabled) await mod.BluetoothManager.enableBluetooth();
    const paired = await mod.BluetoothManager.enableBluetooth();
    // enableBluetooth mengembalikan daftar JSON paired devices pada lib ini.
    const list: PairedDevice[] = [];
    (paired ?? []).forEach((s) => {
      try {
        const o = JSON.parse(s);
        if (o?.address) list.push({ name: o.name ?? 'Printer', address: o.address });
      } catch { /* abaikan entri tak valid */ }
    });
    return list;
  } catch {
    return [];
  }
}

export async function connectPrinter(address: string): Promise<boolean> {
  const mod = loadModule();
  if (!mod) return false;
  try {
    await mod.BluetoothManager.connect(address);
    return true;
  } catch {
    return false;
  }
}

export async function cetakStruk(
  config: UmkmConfig,
  trx: Transaksi,
  items: TransactionItem[]
): Promise<HasilCetak> {
  const mod = loadModule();
  if (!mod) return { ok: false, pesan: 'Printer hanya tersedia di build Android dengan printer Bluetooth.' };
  try {
    const teks = renderStrukText(config, trx, items);
    await mod.BluetoothEscposPrinter.printText(teks + '\n', {});
    if (mod.BluetoothEscposPrinter.printAndFeed) {
      await mod.BluetoothEscposPrinter.printAndFeed(3);
    }
    return { ok: true, pesan: 'Struk tercetak.' };
  } catch (e) {
    return { ok: false, pesan: 'Gagal mencetak. Periksa koneksi printer dan coba lagi.' };
  }
}
