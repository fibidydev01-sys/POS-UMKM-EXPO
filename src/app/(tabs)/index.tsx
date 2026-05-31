import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { Colors, FontSize, Spacing } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import { sapaan } from '../../lib/utils/date';
import {
  getRingkasanOmzet, getTopProduk, getAnalisaDiskon,
  RingkasanOmzet, TopProduk, AnalisaDiskon,
} from '../../lib/db/transaksi';
import { getOmzetDuaMinggu, OmzetHari } from '../../lib/db/omzet-banding';
import { getConfig } from '../../lib/db/pengaturan';

import StatCard from '../../components/dashboard/stat-card';
import ChartOmzet from '../../components/dashboard/chart-omzet';
import TopProdukList from '../../components/dashboard/top-produk';
import AnalisaDiskonList from '../../components/dashboard/analisa-diskon';
import AlertBackup from '../../components/shared/alert-backup';

export default function DashboardScreen() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [ringkasan, setRingkasan] = useState<RingkasanOmzet | null>(null);
  const [omzetIni, setOmzetIni] = useState<OmzetHari[]>([]);
  const [omzetLalu, setOmzetLalu] = useState<OmzetHari[]>([]);
  const [top, setTop] = useState<TopProduk[]>([]);
  const [analisa, setAnalisa] = useState<AnalisaDiskon[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tutupBackup, setTutupBackup] = useState(false);

  const muat = useCallback(async () => {
    const [cfg, r, banding, t, ad] = await Promise.all([
      getConfig(), getRingkasanOmzet(), getOmzetDuaMinggu(), getTopProduk(5), getAnalisaDiskon(),
    ]);
    setNama(cfg.nama_umkm);
    setRingkasan(r);
    setOmzetIni(banding.ini);
    setOmzetLalu(banding.lalu);
    setTop(t);
    setAnalisa(ad);
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const onRefresh = async () => {
    setRefreshing(true);
    await muat();
    setRefreshing(false);
  };

  const perluBackup = !tutupBackup && (ringkasan?.bulanIni ?? 0) > 0 && (ringkasan?.orderBulanIni ?? 0) >= 10;
  const adaRefund = (ringkasan?.jumlahRefundBulan ?? 0) > 0;
  const adaBogo = (ringkasan?.jumlahItemGratisBulan ?? 0) > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.sapaan}>{sapaan()},</Text>
          <Text style={styles.nama} numberOfLines={1}>{nama || 'Juragan'} 👋</Text>
        </View>

        <StatCard
          label="OMZET HARI INI"
          nilai={formatRupiah(ringkasan?.hariIni ?? 0)}
          sub={`${ringkasan?.orderHariIni ?? 0} transaksi hari ini`}
          icon="💰"
          highlight
        />

        <View style={styles.row2}>
          <StatCard label="MINGGU INI" nilai={formatRupiah(ringkasan?.mingguIni ?? 0)} icon="📅" />
          <StatCard
            label="BULAN INI"
            nilai={formatRupiah(ringkasan?.bulanIni ?? 0)}
            sub={`${ringkasan?.orderBulanIni ?? 0} order`}
            icon="📈"
          />
        </View>

        {(adaRefund || adaBogo) && (
          <View style={styles.row2}>
            {adaRefund && (
              <StatCard
                label="REFUND BULAN INI"
                nilai={formatRupiah(ringkasan?.refundBulan ?? 0)}
                sub={`${ringkasan?.jumlahRefundBulan ?? 0} transaksi`}
                icon="↩️"
              />
            )}
            {adaBogo && (
              <StatCard
                label="NILAI BOGO BULAN INI"
                nilai={formatRupiah(ringkasan?.nilaiBogoBulan ?? 0)}
                sub={`${ringkasan?.jumlahItemGratisBulan ?? 0} item digratiskan`}
                icon="🎁"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg },
  header: { marginBottom: Spacing.lg },
  sapaan: { fontSize: FontSize.md, color: Colors.textMuted },
  nama: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: 2 },
  row2: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  section: { marginTop: Spacing.lg },
});
