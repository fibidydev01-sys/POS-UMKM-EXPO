/**
 * import.ts — pilih file Excel backup lalu impor (mengganti data transaksi).
 *
 * Hanya tabel transaksi & item yang di-restore (menu tetap milik perangkat,
 * agar referensi tidak rusak). Dibungkus try/catch → { ok, pesan }.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { getDb } from '../db/database';

interface Hasil { ok: boolean; pesan: string; }

function angka(v: any): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

export async function pilihDanImport(): Promise<Hasil> {
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

    return { ok: true, pesan: `Import selesai. ${jumlah} transaksi dipulihkan.` };
  } catch (e) {
    return { ok: false, pesan: 'Gagal mengimpor file. Pastikan file adalah backup Excel dari aplikasi ini.' };
  }
}
