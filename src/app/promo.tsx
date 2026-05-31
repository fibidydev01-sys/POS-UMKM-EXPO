/**
 * Halaman kelola Program Promo (BOGO / Buy2Get1). V2 only — dibuka dari
 * Pengaturan. Daftar promo + tambah (FormPromoRule) + nonaktifkan.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import { MenuItem, PromoRule } from '../lib/db/database';
import { getMenuItems } from '../lib/db/menu';
import { getPromoRules, tambahPromoRule, hapusPromoRule } from '../lib/db/promo-rule';
import { formatTanggal } from '../lib/utils/date';
import FormPromoRule from '../components/pengaturan/form-promo-rule';
import EmptyState from '../components/shared/empty-state';

const TIPE_LABEL: Record<string, string> = { bogo: 'Beli 1 Gratis 1', buy2get1: 'Beli 2 Gratis 1' };

export default function PromoScreen() {
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [formVisible, setFormVisible] = useState(false);

  const muat = useCallback(async () => {
    const [r, m] = await Promise.all([getPromoRules(), getMenuItems()]);
    setRules(r);
    setMenu(m.filter((x) => x.is_available === 1));
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const simpan = async (input: any) => {
    try {
      await tambahPromoRule(input);
      setFormVisible(false);
      await muat();
    } catch {
      Alert.alert('Gagal', 'Tidak bisa menyimpan promo. Coba lagi.');
    }
  };

  const konfirmasiHapus = (rule: PromoRule) => {
    Alert.alert('Nonaktifkan promo?', `Promo untuk "${rule.nama_produk}" akan dimatikan.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Nonaktifkan', style: 'destructive', onPress: async () => { await hapusPromoRule(rule.id); await muat(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rules.filter((r) => r.is_active === 1)}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Promo otomatis berlaku di kasir. Item gratis dihitung mengikuti kelipatan pembelian.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.kiri}>
              <Text style={styles.nama}>{item.nama_produk}</Text>
              <Text style={styles.tipe}>{TIPE_LABEL[item.tipe_promo] ?? item.tipe_promo}</Text>
              <Text style={styles.tgl}>
                {item.berlaku_sampai ? `Berlaku s/d ${formatTanggal(item.berlaku_sampai)}` : 'Tanpa batas waktu'}
              </Text>
            </View>
            <Pressable onPress={() => konfirmasiHapus(item)} hitSlop={8}>
              <Text style={styles.hapus}>Nonaktifkan</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="🎁" judul="Belum ada promo" deskripsi="Tambah promo BOGO atau Buy 2 Get 1 untuk produk Anda.">
            <Pressable style={styles.emptyBtn} onPress={() => setFormVisible(true)}>
              <Text style={styles.emptyBtnTeks}>+ Tambah Promo</Text>
            </Pressable>
          </EmptyState>
        }
      />

      <Pressable style={styles.fab} onPress={() => setFormVisible(true)}>
        <Text style={styles.fabTeks}>＋</Text>
      </Pressable>

      <FormPromoRule
        visible={formVisible}
        menuItems={menu}
        onTutup={() => setFormVisible(false)}
        onSimpan={simpan}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 120 },
  intro: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...shadow(1),
  },
  kiri: { flex: 1, gap: 2 },
  nama: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  tipe: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  tgl: { fontSize: FontSize.xs, color: Colors.textMuted },
  hapus: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.full },
  emptyBtnTeks: { color: Colors.onPrimary, fontWeight: '700', fontSize: FontSize.md },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow(3), elevation: 12,
  },
  fabTeks: { color: Colors.onPrimary, fontSize: 32, fontWeight: '300', marginTop: -2 },
});
