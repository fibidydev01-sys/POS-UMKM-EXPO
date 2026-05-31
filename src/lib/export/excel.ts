/**
 * excel.ts — export seluruh data transaksi ke file Excel (.xlsx) lalu share.
 *
 * Memakai SheetJS (xlsx) + expo-file-system + expo-sharing. Semua dibungkus
 * try/catch dan mengembalikan { ok, pesan } agar UI bisa menampilkan status.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getDb } from '../db/database';
import { formatTanggalJam } from '../utils/date';

interface Hasil { ok: boolean; pesan: string; }

export async function exportDanShare(): Promise<Hasil> {
  try {
    const db = getDb();

    const transaksi = await db.getAllAsync<any>(
      `SELECT nomor_order, created_at, status, payment_method,
              subtotal, diskon_persen, diskon_nominal, grand_total,
              uang_diterima, kembalian, void_reason
       FROM transaksi ORDER BY created_at DESC`
    );
    const items = await db.getAllAsync<any>(
      `SELECT t.nomor_order, ti.nama_produk, ti.harga_satuan, ti.qty,
              ti.subtotal, ti.item_type
       FROM transaction_item ti
       JOIN transaksi t ON t.id = ti.transaksi_id
       ORDER BY t.created_at DESC, ti.id ASC`
    );
    const menu = await db.getAllAsync<any>(
      `SELECT nama, harga, is_available, is_deleted FROM menu_item`
    );

    const wb = XLSX.utils.book_new();

    const trxRows = transaksi.map((t) => ({
      'Nomor Order': t.nomor_order,
      'Waktu': formatTanggalJam(t.created_at),
      'Status': t.status,
      'Metode Bayar': t.payment_method,
      'Subtotal': t.subtotal,
      'Diskon %': t.diskon_persen,
      'Diskon Rp': t.diskon_nominal,
      'Grand Total': t.grand_total,
      'Uang Diterima': t.uang_diterima ?? '',
      'Kembalian': t.kembalian ?? '',
      'Alasan Void/Refund': t.void_reason ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxRows), 'Transaksi');

    const itemRows = items.map((it) => ({
      'Nomor Order': it.nomor_order,
      'Produk': it.nama_produk,
      'Harga Satuan': it.harga_satuan,
      'Qty': it.qty,
      'Subtotal': it.subtotal,
      'Tipe': it.item_type,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Item Transaksi');

    const menuRows = menu.map((m) => ({
      'Nama': m.nama,
      'Harga': m.harga,
      'Tersedia': m.is_available ? 'Ya' : 'Tidak',
      'Dihapus': m.is_deleted ? 'Ya' : 'Tidak',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuRows), 'Menu');

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const stamp = new Date().toISOString().slice(0, 10);
    const uri = `${FileSystem.cacheDirectory}backup-pos-${stamp}.xlsx`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, pesan: `File tersimpan di:\n${uri}\n(Berbagi tidak tersedia di perangkat ini.)` };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Bagikan Backup POS',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
    return { ok: true, pesan: 'Backup berhasil dibuat & dibagikan.' };
  } catch (e) {
    return { ok: false, pesan: 'Gagal membuat file backup. Coba lagi.' };
  }
}
