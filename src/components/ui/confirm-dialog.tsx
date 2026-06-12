/**
 * confirm-dialog.tsx — Alert konfirmasi reusable.
 *
 * Mengganti Alert.alert(...) pattern konfirmasi yang duplikat di:
 *   - menu.tsx      (hapus item, hapus kategori)
 *   - riwayat.tsx   (void transaksi)
 *   - pengaturan.tsx (hapus preset diskon)
 *   - pembayaran.tsx (hapus kredensial) — V2
 *   - promo.tsx     (nonaktifkan promo) — V2
 *
 * Cara pakai:
 *   import { showConfirm } from '../ui/confirm-dialog';
 *
 *   showConfirm({
 *     title: 'Hapus produk?',
 *     message: '"Kopi Tubruk" akan dihapus.',
 *     onConfirm: () => void hapusItem(id),
 *   });
 */
import { Alert } from 'react-native';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  /** Label tombol konfirmasi. Default: 'Hapus' */
  confirmLabel?: string;
  /** Style tombol konfirmasi. Default: 'destructive' */
  confirmStyle?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showConfirm(options: ConfirmDialogOptions): void {
  Alert.alert(
    options.title,
    options.message,
    [
      {
        text: 'Batal',
        style: 'cancel',
        onPress: options.onCancel,
      },
      {
        text: options.confirmLabel ?? 'Hapus',
        style: options.confirmStyle ?? 'destructive',
        onPress: options.onConfirm,
      },
    ]
  );
}
