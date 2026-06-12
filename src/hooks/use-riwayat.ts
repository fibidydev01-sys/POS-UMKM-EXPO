/**
 * use-riwayat.ts — state + actions untuk tab Riwayat.
 *
 * MEMINDAHKAN dari riwayat.tsx:
 *   - riwayat, config, detail, detailItems
 *   - refundMode, refundAlasan, refundLoading
 *   - voidLoading, mencetak
 *   - actions: muat, bukaDetail, tutupDetail, handleVoid, submitRefund, cetakUlang
 *
 * Yang TETAP di riwayat.tsx:
 *   - fontMetrics (perlu windowWidth, lebih tepat di komponen)
 *   - render FlatList dan BottomSheet (UI layer)
 *
 * PERUBAHAN (FINISHING):
 *   - TOAST setelah void & refund berhasil (Audit B5 — sebelumnya tanpa
 *     feedback sama sekali): toast.success('Transaksi berhasil di-void') dan
 *     toast.success('Refund berhasil diproses').
 *   - PULL-TO-REFRESH: state `refreshing` + action `onRefresh` untuk
 *     RefreshControl di FlatList riwayat.
 *   - cetakUlang() memakai cetakStrukKePrinter() (satu pintu, pesan error
 *     BT-aware, nama printer) + toast sukses dengan nama printer.
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type {
  Transaksi,
  TransactionItem,
  UmkmConfig,
} from '../lib/db/database';
import {
  getRiwayat,
  getItemsByTransaksi,
  voidTransaksi,
  refundTransaksi,
} from '../lib/db/transaksi';
import { getConfig } from '../lib/db/pengaturan';
import { cetakStrukKePrinter, printerTersedia } from '../lib/printer/struk';
import { useToast } from '../components/ui/toast';

export interface RiwayatHookResult {
  riwayat: Transaksi[];
  config: UmkmConfig | null;
  detail: Transaksi | null;
  detailItems: TransactionItem[];
  refundMode: boolean;
  refundAlasan: string;
  refundLoading: boolean;
  voidLoading: boolean;
  mencetak: boolean;
  refreshing: boolean;
  // Actions
  muat: () => Promise<void>;
  onRefresh: () => Promise<void>;
  bukaDetail: (trx: Transaksi) => Promise<void>;
  tutupDetail: () => void;
  handleVoid: () => void;
  submitRefund: () => Promise<void>;
  cetakUlang: () => Promise<void>;
  setRefundMode: (v: boolean) => void;
  setRefundAlasan: (v: string) => void;
}

export function useRiwayat(): RiwayatHookResult {
  const toast = useToast();

  const [riwayat, setRiwayat] = useState<Transaksi[]>([]);
  const [config, setConfig] = useState<UmkmConfig | null>(null);
  const [detail, setDetail] = useState<Transaksi | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);
  const [mencetak, setMencetak] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [refundMode, setRefundMode] = useState(false);
  const [refundAlasan, setRefundAlasan] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const muat = useCallback(async () => {
    const [r, c] = await Promise.all([getRiwayat(200), getConfig()]);
    setRiwayat(r);
    setConfig(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat])
  );

  // Pull-to-refresh: dipakai RefreshControl di FlatList riwayat.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await muat();
    } finally {
      setRefreshing(false);
    }
  }, [muat]);

  const bukaDetail = useCallback(async (trx: Transaksi) => {
    const items = await getItemsByTransaksi(trx.id);
    setDetailItems(items);
    setRefundMode(false);
    setRefundAlasan('');
    setDetail(trx);
  }, []);

  const tutupDetail = useCallback(() => {
    setDetail(null);
    setDetailItems([]);
    setRefundMode(false);
    setRefundAlasan('');
  }, []);

  const handleVoid = useCallback(() => {
    if (!detail || detail.status !== 'completed') return;
    const target = detail;
    Alert.alert(
      'Void transaksi?',
      `Order ${target.nomor_order} akan ditandai VOID dan tidak masuk rekap omzet.\n\nTindakan ini tidak bisa dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setVoidLoading(true);
              try {
                await voidTransaksi(target.id);
                tutupDetail();
                await muat();
                // Feedback sukses — sebelumnya tidak ada sama sekali.
                toast.success('Transaksi berhasil di-void');
              } catch {
                Alert.alert('Gagal', 'Tidak bisa void transaksi. Coba lagi.');
              } finally {
                setVoidLoading(false);
              }
            })();
          },
        },
      ]
    );
  }, [detail, muat, tutupDetail, toast]);

  const submitRefund = useCallback(async () => {
    if (!detail) return;
    const alasan = refundAlasan.trim();
    if (!alasan) {
      Alert.alert('Alasan wajib', 'Isi alasan refund terlebih dahulu.');
      return;
    }
    setRefundLoading(true);
    try {
      await refundTransaksi(detail.id, alasan);
      tutupDetail();
      await muat();
      // Feedback sukses — sebelumnya tidak ada sama sekali.
      toast.success('Refund berhasil diproses');
    } catch {
      Alert.alert('Gagal', 'Tidak bisa memproses refund. Coba lagi.');
    } finally {
      setRefundLoading(false);
    }
  }, [detail, refundAlasan, muat, tutupDetail, toast]);

  const cetakUlang = useCallback(async () => {
    if (!config || !detail) return;
    if (!printerTersedia()) {
      Alert.alert(
        'Printer tidak tersedia',
        'Cetak struk hanya berjalan di build Android dengan printer bluetooth.'
      );
      return;
    }
    setMencetak(true);
    try {
      // Satu pintu: device list diambil SEKALI, pesan error BT-aware,
      // nama printer dikembalikan untuk feedback.
      const res = await cetakStrukKePrinter(config, detail, detailItems);
      if (res.ok) {
        toast.success(res.pesan); // "Struk terkirim ke <nama printer>."
      } else {
        Alert.alert('Gagal cetak', res.pesan);
      }
    } finally {
      setMencetak(false);
    }
  }, [config, detail, detailItems, toast]);

  return {
    riwayat,
    config,
    detail,
    detailItems,
    refundMode,
    refundAlasan,
    refundLoading,
    voidLoading,
    mencetak,
    refreshing,
    muat,
    onRefresh,
    bukaDetail,
    tutupDetail,
    handleVoid,
    submitRefund,
    cetakUlang,
    setRefundMode,
    setRefundAlasan,
  };
}
