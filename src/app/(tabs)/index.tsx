import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors, FontSize, Spacing } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { sapaan } from '../../lib/utils/date';
import type {
  RingkasanOmzet, TopProduk, AnalisaDiskon} from '../../lib/db/transaksi';
import {
  getRingkasanOmzet, getTopProduk, getAnalisaDiskon
} from '../../lib/db/transaksi';
import type { OmzetHari } from '../../lib/db/omzet-banding';
import { getOmzetDuaMinggu } from '../../lib/db/omzet-banding';
import { getConfig } from '../../lib/db/pengaturan';
import type { StockReport } from '../../lib/db/stock';
import { getStockReport } from '../../lib/db/stock';
// Laporan stok BAHAN (migration v4).
import type { BahanReport } from '../../lib/db/bahan';
import { getBahanReport } from '../../lib/db/bahan';
import { getMenuItems } from '../../lib/db/menu';
import type { MenuItem } from '../../lib/db/database';

import ScreenLayout from '../../components/ui/screen-layout';
import StatCard from '../../components/dashboard/stat-card';
import ChartOmzet from '../../components/dashboard/chart-omzet';
import TopProdukList from '../../components/dashboard/top-produk';
import AnalisaDiskonList from '../../components/dashboard/analisa-diskon';
import LaporanStok from '../../components/dashboard/laporan-stok';
import LaporanBahan from '../../components/dashboard/laporan-bahan';
import AlertBackup from '../../components/shared/alert-backup';
import StokOpname from '../../components/menu/stok-opname';
import BahanKelola from '../../components/menu/bahan-kelola';

const STOK_KOSONG: StockReport = {
  items: [], totalNilai: 0, totalSku: 0, jumlahMenipis: 0, jumlahHabis: 0,
};

const BAHAN_KOSONG: BahanReport = {
  items: [], totalNilai: 0, totalSku: 0, jumlahMenipis: 0, jumlahHabis: 0,
};

export default function DashboardScreen() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [ringkasan, setRingkasan] = useState<RingkasanOmzet | null>(null);
  const [omzetIni, setOmzetIni] = useState<OmzetHari[]>([]);
  const [omzetLalu, setOmzetLalu] = useState<OmzetHari[]>([]);
  const [top, setTop] = useState<TopProduk[]>([]);
  const [analisa, setAnalisa] = useState<AnalisaDiskon[]>([]);
  const [stok, setStok] = useState<StockReport>(STOK_KOSONG);
  const [bahan, setBahan] = useState<BahanReport>(BAHAN_KOSONG);
  const [refreshing, setRefreshing] = useState(false);
  const [tutupBackup, setTutupBackup] = useState(false);

  // Sheet kelola stok (restock/opname) — dibuka dari kartu laporan stok.
  const [menuStok, setMenuStok] = useState<MenuItem[]>([]);
  const [kelolaStokBuka, setKelolaStokBuka] = useState(false);

  // Sheet kelola BAHAN — dibuka dari kartu laporan stok bahan.
  const [bahanBuka, setBahanBuka] = useState(false);

  const muat = useCallback(async () => {
    const [cfg, r, banding, t, ad, sr, br] = await Promise.all([
      getConfig(), getRingkasanOmzet(), getOmzetDuaMinggu(), getTopProduk(5), getAnalisaDiskon(),
      getStockReport(), getBahanReport(),
    ]);
    setNama(cfg.nama_umkm);
    setRingkasan(r);
    setOmzetIni(banding.ini);
    setOmzetLalu(banding.lalu);
    setTop(t);
    setAnalisa(ad);
    setStok(sr);
    setBahan(br);
  }, []);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const onRefresh = async () => {
    setRefreshing(true);
    await muat();
    setRefreshing(false);
  };

  const bukaKelolaStok = async () => {
    const items = await getMenuItems();
    setMenuStok(items);
    setKelolaStokBuka(true);
  };

  // Dipanggil StokOpname setelah ada perubahan stok: segarkan data dashboard
  // sekaligus daftar produk di dalam sheet (sheet tetap terbuka).
  const onStokBerubah = useCallback(async () => {
    const [items] = await Promise.all([getMenuItems(), muat()]);
    setMenuStok(items);
  }, [muat]);

  const perluBackup = !tutupBackup && (ringkasan?.bulanIni ?? 0) > 0 && (ringkasan?.orderBulanIni ?? 0) >= 10;
  const adaRefund = (ringkasan?.jumlahRefundBulan ?? 0) > 0;
  const adaBogo = (ringkasan?.jumlahItemGratisBulan ?? 0) > 0;

  return (
    <ScreenLayout edges={['top']} bodyPadding={0}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.sapaan}>{sapaan()},</Text>
          <Text style={styles.nama} numberOfLines={1}>{nama || 'Juragan'}</Text>
        </View>

        <StatCard
          label="OMZET HARI INI"
          nilai={formatRupiah(ringkasan?.hariIni ?? 0)}
          sub={`${ringkasan?.orderHariIni ?? 0} transaksi hari ini`}
          icon="wallet"
          highlight
        />

        <View style={styles.row2}>
          <StatCard label="MINGGU INI" nilai={formatRupiah(ringkasan?.mingguIni ?? 0)} icon="calendar" />
          <StatCard
            label="BULAN INI"
            nilai={formatRupiah(ringkasan?.bulanIni ?? 0)}
            sub={`${ringkasan?.orderBulanIni ?? 0} order`}
            icon="trending-up"
          />
        </View>

        {(adaRefund || adaBogo) && (
          <View style={styles.row2}>
            {adaRefund && (
              <StatCard
                label="REFUND BULAN INI"
                nilai={formatRupiah(ringkasan?.refundBulan ?? 0)}
                sub={`${ringkasan?.jumlahRefundBulan ?? 0} transaksi`}
                icon="undo"
              />
            )}
            {adaBogo && (
              <StatCard
                label="NILAI BOGO BULAN INI"
                nilai={formatRupiah(ringkasan?.nilaiBogoBulan ?? 0)}
                sub={`${ringkasan?.jumlahItemGratisBulan ?? 0} item digratiskan`}
                icon="gift"
              />
            )}
          </View>
        )}

        {perluBackup && (
          <View style={styles.section}>
            <AlertBackup
              onBackup={() => router.push('/(tabs)/pengaturan')}
              onTutup={() => setTutupBackup(true)}
            />
          </View>
        )}

        {/* Laporan stok produk — masuk dashboard analitik. */}
        <View style={styles.section}>
          <LaporanStok data={stok} onKelola={() => { void bukaKelolaStok(); }} />
        </View>

        {/* Laporan stok BAHAN (migration v4) — tampil setelah stok produk. */}
        <View style={styles.section}>
          <LaporanBahan data={bahan} onKelola={() => setBahanBuka(true)} />
        </View>

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

      {/* Sheet kelola stok (restock & opname). */}
      <StokOpname
        visible={kelolaStokBuka}
        items={menuStok}
        onTutup={() => setKelolaStokBuka(false)}
        onPerubahan={() => { void onStokBerubah(); }}
      />

      {/* Sheet kelola BAHAN (restock & opname bahan). */}
      <BahanKelola
        visible={bahanBuka}
        onTutup={() => setBahanBuka(false)}
        onPerubahan={() => { void muat(); }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },
  header: { marginBottom: Spacing.lg },
  sapaan: { fontSize: FontSize.md, color: Colors.textMuted },
  nama: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: 2 },
  row2: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  section: { marginTop: Spacing.lg },
});
