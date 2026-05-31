/**
 * excel.ts — export & import data transaksi via file Excel (.xlsx).
 *
 * Export: kumpulkan semua transaksi → .xlsx → share.
 * Import: pilih file .xlsx → restore tabel transaksi & item.
 *
 * PERBAIKAN: nama fungsi diselaraskan dengan pemanggil di pengaturan.tsx:
 *   exportExcel()  → { ok, pesan }
 *   importExcel()  → { ok, pesan, jumlah }
 *
 * Memakai SheetJS (xlsx) + expo-file-system + expo-sharing + expo-document-picker.
 * Semua dibungkus try/catch.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { getDb } from '../db/database';
import { formatTanggalJam } from '../utils/date';

export interface HasilExport { ok: boolean; pesan: string; }
export interface HasilImport { ok: boolean; pesan: string; jumlah?: number; }

function angka(v: any): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// ───────────────────────── EXPORT ─────────────────────────

export async function exportExcel(): Promise<HasilExport> {
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

// ───────────────────────── IMPORT ─────────────────────────

export async function importExcel(): Promise<HasilImport> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets || res.assets.length === 0) {
      return { ok: false, pesan: 'Import dibatalkan.' };
    }

    const uri = res.assets[0].uri;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const wb = XLSX.read(base64, { type: 'base64' });

    const shTrx = wb.Sheets['Transaksi'];
    const shItem = wb.Sheets['Item Transaksi'];
    if (!shTrx) return { ok: false, pesan: 'Format file tidak dikenali (sheet "Transaksi" tidak ada).' };

    const trxRows = XLSX.utils.sheet_to_json<any>(shTrx);
    const itemRows = shItem ? XLSX.utils.sheet_to_json<any>(shItem) : [];

    const db = getDb();
    let jumlah = 0;

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM transaction_item`);
      await db.runAsync(`DELETE FROM transaksi`);

      const idByOrder = new Map<string, number>();

      for (const t of trxRows) {
        const nomor = String(t['Nomor Order'] ?? '').trim();
        if (!nomor) continue;
        const r = await db.runAsync(
          `INSERT INTO transaksi
            (nomor_order, subtotal, diskon_preset_id, diskon_persen, diskon_nominal,
             grand_total, payment_method, uang_diterima, kembalian, status, void_reason)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nomor,
            angka(t['Subtotal']),
            angka(t['Diskon %']),
            angka(t['Diskon Rp']),
            angka(t['Grand Total']),
            String(t['Metode Bayar'] ?? 'tunai'),
            t['Uang Diterima'] === '' ? null : angka(t['Uang Diterima']),
            t['Kembalian'] === '' ? null : angka(t['Kembalian']),
            String(t['Status'] ?? 'completed'),
            t['Alasan Void/Refund'] ? String(t['Alasan Void/Refund']) : null,
          ]
        );
        idByOrder.set(nomor, r.lastInsertRowId as number);
        jumlah++;
      }

      for (const it of itemRows) {
        const nomor = String(it['Nomor Order'] ?? '').trim();
        const tid = idByOrder.get(nomor);
        if (!tid) continue;
        await db.runAsync(
          `INSERT INTO transaction_item
            (transaksi_id, menu_item_id, nama_produk, harga_satuan, qty, subtotal, item_type)
           VALUES (?, NULL, ?, ?, ?, ?, ?)`,
          [
            tid,
            String(it['Produk'] ?? ''),
            angka(it['Harga Satuan']),
            angka(it['Qty']),
            angka(it['Subtotal']),
            String(it['Tipe'] ?? 'normal'),
          ]
        );
      }
    });

    return { ok: true, pesan: `Import selesai. ${jumlah} transaksi dipulihkan.`, jumlah };
  } catch (e) {
    return { ok: false, pesan: 'Gagal mengimpor file. Pastikan file adalah backup Excel dari aplikasi ini.' };
  }
}
