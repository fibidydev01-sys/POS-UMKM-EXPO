/**
 * index.tsx — Tab Beranda / Dashboard.
 *
 * PERUBAHAN Phase 4.1:
 *   - Tambah empty state saat ringkasan === null (pengguna baru).
 *   - Import diperbaiki: AlertBackup & StatCard dari ui/ (bukan shared/ / dashboard/).
 *
 * PERUBAHAN (FINISHING / UX AUDIT B6):
 *   - 🐞 FIX BUG ROUTE RUSAK: tombol empty state "Tambah Produk Pertama"
 *     sebelumnya push ke '/pengaturan/menu' — route itu TIDAK ADA (halaman
 *     pengaturan tidak punya sub-page menu) sehingga user baru mendarat di
 *     Unmatched Route. Sekarang langsung ke '/menu/tambah-produk' (form
 *     tambah produk) — lebih cepat satu langkah pula.
 *   - Alert backup: tombol "Backup Sekarang" LANGSUNG menjalankan
 *     exportExcel() (dengan loading state + toast hasil), bukan navigate ke
 *     tab Pengaturan lalu user harus tap lagi.
 *
 * Lapis 3 DIHAPUS:
 *   - Import BahanReport / getBahanReport dihapus
 *   - Import LaporanBahan dihapus
 *   - State bahan & BAHAN_KOSONG dihapus
 *   - getBahanReport di Promise.all dihapus
 *   - Render LaporanBahan dihapus
 *   - onKelola → /menu/bahan dihapus
 *
 *   LaporanStok.onKelola → router.push('/menu/stok') ← TETAP ADA
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { Colors, FontSize, Spacing } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { sapaan } from '../../lib/utils/date';
import type { RingkasanOmzet, TopProduk, AnalisaDiskon } from '../../lib/db/transaksi';
import { getRingkasanOmzet, getTopProduk, getAnalisaDiskon } from '../../lib/db/transaksi';
import type { OmzetHari } from '../../lib/db/omzet-banding';
import { getOmzetDuaMinggu } from '../../lib/db/omzet-banding';
import { getConfig } from '../../lib/db/pengaturan';
import type { StockReport } from '../../lib/db/stock';
import { getStockReport } from '../../lib/db/stock';
import { features } from '../../lib/config/features';
import { exportExcel } from '../../lib/export/excel';
import { useToast } from '../../components/ui/toast';

import ScreenLayout from '../../components/ui/screen-layout';
import StatCard from '../../components/ui/stat-card';
import AlertBackup from '../../components/ui/alert-backup';
import EmptyState from '../../components/ui/empty-state';
import ChartOmzet from '../../components/dashboard/chart-omzet';
import TopProdukList from '../../components/dashboard/top-produk';
import AnalisaDiskonList from '../../components/dashboard/analisa-diskon';
import LaporanStok from '../../components/dashboard/laporan-stok';

const STOK_KOSONG: StockReport = {
  items: [], totalNilai: 0, totalSku: 0, jumlahMenipis: 0, jumlahHabis: 0,
};

export default function DashboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const showInventory = features.inventory;

  const [nama, setNama] = useState('');
  const [ringkasan, setRingkasan] = useState<RingkasanOmzet | null>(null);
  const [omzetIni, setOmzetIni] = useState<OmzetHari[]>([]);
  const [omzetLalu, setOmzetLalu] = useState<OmzetHari[]>([]);
  const [top, setTop] = useState<TopProduk[]>([]);
  const [analisa, setAnalisa] = useState<AnalisaDiskon[]>([]);
  const [stok, setStok] = useState<StockReport>(STOK_KOSONG);
  const [refreshing, setRefreshing] = useState(false);
  const [tutupBackup, setTutupBackup] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const muat = useCallback(async () => {
    const [cfg, r, banding, t, ad, sr] = await Promise.all([
      getConfig(),
      getRingkasanOmzet(),
      getOmzetDuaMinggu(),
      getTopProduk(5),
      getAnalisaDiskon(),
      showInventory ? getStockReport() : Promise.resolve(STOK_KOSONG),
    ]);
    setNama(cfg.nama_umkm);
    setRingkasan(r);
    setOmzetIni(banding.ini);
    setOmzetLalu(banding.lalu);
    setTop(t);
    setAnalisa(ad);
    setStok(sr);
  }, [showInventory]);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const onRefresh = async () => {
    setRefreshing(true);
    await muat();
    setRefreshing(false);
  };

  /**
   * Backup langsung dari alert beranda — tidak lagi navigate ke Pengaturan.
   * Sukses → toast + alert ditutup. Gagal → toast error, alert tetap tampil.
   */
  const onBackupSekarang = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const res = await exportExcel();
      if (res.ok) {
        toast.success(res.pesan || 'Backup berhasil dibuat.');
        setTutupBackup(true);
      } else {
        toast.error(res.pesan || 'Tidak bisa membuat backup. Coba lagi.');
      }
    } catch {
      toast.error('Tidak bisa membuat backup. Coba lagi.');
    } finally {
      setBackupLoading(false);
    }
  };

  const perluBackup =
    !tutupBackup &&
    (ringkasan?.bulanIni ?? 0) > 0 &&
    (ringkasan?.orderBulanIni ?? 0) >= 10;
  const adaRefund = (ringkasan?.jumlahRefundBulan ?? 0) > 0;
  const adaBogo = (ringkasan?.jumlahItemGratisBulan ?? 0) > 0;

  return (
    <ScreenLayout edges={['top']} bodyPadding={0}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void onRefresh(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.sapaan}>{sapaan()},</Text>
          <Text style={styles.nama} numberOfLines={1}>
            {nama || 'Juragan'}
          </Text>
        </View>

        {/* Phase 4.1: Empty state untuk pengguna baru */}
        {ringkasan === null && (
          <View style={styles.section}>
            <EmptyState
              icon="home"
              judul="Selamat datang!"
              deskripsi="Tambahkan produk di tab Menu, lalu mulai transaksi pertama di tab Kasir."
            >
              <Pressable
                style={styles.mulaiBtn}
                onPress={() => router.push('/menu/tambah-produk' as Href)}
              >
                <Text style={styles.mulaiBtnTeks}>Tambah Produk Pertama</Text>
              </Pressable>
            </EmptyState>
          </View>
        )}

        {ringkasan !== null && (
          <>
            <StatCard
              label="OMZET HARI INI"
              nilai={formatRupiah(ringkasan.hariIni)}
              sub={`${ringkasan.orderHariIni} transaksi hari ini`}
              icon="wallet"
              highlight
            />

            <View style={styles.row2}>
              <StatCard
                label="MINGGU INI"
                nilai={formatRupiah(ringkasan.mingguIni)}
                icon="calendar"
              />
              <StatCard
                label="BULAN INI"
                nilai={formatRupiah(ringkasan.bulanIni)}
                sub={`${ringkasan.orderBulanIni} order`}
                icon="trending-up"
              />
            </View>

            {(adaRefund || adaBogo) && (
              <View style={styles.row2}>
                {adaRefund && (
                  <StatCard
                    label="REFUND BULAN INI"
                    nilai={formatRupiah(ringkasan.refundBulan)}
                    sub={`${ringkasan.jumlahRefundBulan} transaksi`}
                    icon="undo"
                  />
                )}
                {adaBogo && (
                  <StatCard
                    label="NILAI BOGO BULAN INI"
                    nilai={formatRupiah(ringkasan.nilaiBogoBulan)}
                    sub={`${ringkasan.jumlahItemGratisBulan} item digratiskan`}
                    icon="gift"
                  />
                )}
              </View>
            )}
          </>
        )}

        {perluBackup && (
          <View style={styles.section}>
            <AlertBackup
              loading={backupLoading}
              onBackup={() => { void onBackupSekarang(); }}
              onTutup={() => setTutupBackup(true)}
            />
          </View>
        )}

        {/* Hanya LaporanStok produk — LaporanBahan sudah dihapus total */}
        {showInventory && (
          <View style={styles.section}>
            <LaporanStok
              data={stok}
              onKelola={() => router.push('/menu/stok' as Href)}
            />
          </View>
        )}

        <View style={styles.section}>
          <ChartOmzet data={omzetIni} dataLalu={omzetLalu} />
        </View>
        <View style={styles.section}>
          <TopProdukList data={top} />
        </View>
        <View style={styles.section}>
          <AnalisaDiskonList data={analisa} />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },
  header: { marginBottom: Spacing.lg },
  sapaan: { fontSize: FontSize.md, color: Colors.textMuted },
  nama: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  row2: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  section: { marginTop: Spacing.lg },
  mulaiBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  mulaiBtnTeks: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});
