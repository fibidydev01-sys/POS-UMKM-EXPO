/**
 * pengaturan/promo.tsx — Halaman Program Promo (BOGO / Buy2Get1).
 *
 * PINDAH dari app/promo.tsx ke app/pengaturan/promo.tsx.
 * Header kini otomatis dari pengaturan/_layout.tsx:
 *   - headerBackTitle: 'Pengaturan'
 *   - headerShadowVisible: false
 *
 * SPLIT: konten dipecah ke dua komponen:
 *   - PromoList  → components/pengaturan/promo-list.tsx
 *   - FormPromo  → components/pengaturan/form-promo.tsx
 *
 * Pola navigasi mode:
 *   Mode LIST → back arrow Stack default (keluar ke Pengaturan).
 *   Mode FORM → back arrow override ke kembaliKeList().
 *   Tidak ada headerRight di mode apapun.
 *
 * PERUBAHAN (FINISHING) — Audit B9:
 *   - errorField ('produk' | 'mulai' | 'selesai' | null) → FormPromo memberi
 *     border merah pada elemen yang invalid.
 *   - saving guard: cegah double-submit; tombol "Menyimpan…".
 *   - Toast sukses setelah promo tersimpan.
 */
import { useState, useCallback } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import { showConfirm } from '../../components/ui/confirm-dialog';
import { useToast } from '../../components/ui/toast';
import type { MenuItem, PromoRule } from '../../lib/db/database';
import { getMenuItems } from '../../lib/db/menu';
import { getPromoRules, tambahPromoRule, hapusPromoRule } from '../../lib/db/promo-rule';
import PromoList from '../../components/pengaturan/promo-list';
import FormPromo, { type PromoErrorField } from '../../components/pengaturan/form-promo';

type Mode = 'list' | 'form';
type PromoTipe = 'bogo' | 'buy2get1';
const RX_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default function PromoScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const FAB_CLEARANCE = 60 + insets.bottom + Spacing.xl;

  const [mode, setMode] = useState<Mode>('list');
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const [tipe, setTipe] = useState<PromoTipe>('bogo');
  const [menuItemId, setMenuItemId] = useState<number | null>(null);
  const [mulai, setMulai] = useState('');
  const [selesai, setSelesai] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<PromoErrorField>(null);
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const [r, m] = await Promise.all([getPromoRules(), getMenuItems()]);
    setRules(r);
    setMenu(m.filter((x) => x.is_available === 1));
  }, []);

  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  const resetForm = useCallback(() => {
    setTipe('bogo');
    setMenuItemId(null);
    setMulai('');
    setSelesai('');
    setError('');
    setErrorField(null);
  }, []);

  const bukaForm = useCallback(() => { resetForm(); setMode('form'); }, [resetForm]);

  const kembaliKeList = useCallback(() => { setMode('list'); resetForm(); }, [resetForm]);

  const clearError = useCallback(() => {
    setError('');
    setErrorField(null);
  }, []);

  const simpan = useCallback(async () => {
    if (saving) return; // guard double-submit
    if (menuItemId == null) {
      setError('Pilih produk target promo.');
      setErrorField('produk');
      return;
    }
    if (mulai && !RX_TANGGAL.test(mulai)) {
      setError('Tanggal mulai harus format YYYY-MM-DD.');
      setErrorField('mulai');
      return;
    }
    if (selesai && !RX_TANGGAL.test(selesai)) {
      setError('Tanggal selesai harus format YYYY-MM-DD.');
      setErrorField('selesai');
      return;
    }
    if (mulai && selesai && selesai < mulai) {
      setError('Tanggal selesai tidak boleh sebelum mulai.');
      setErrorField('selesai');
      return;
    }
    setSaving(true);
    try {
      await tambahPromoRule({
        menu_item_id: menuItemId,
        tipe_promo: tipe,
        berlaku_mulai: mulai || '',
        berlaku_sampai: selesai || null,
      });
      await muat();
      kembaliKeList();
      toast.success('Program promo tersimpan');
    } catch {
      toast.error('Tidak bisa menyimpan promo. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [saving, menuItemId, tipe, mulai, selesai, muat, kembaliKeList, toast]);

  const konfirmasiNonaktif = useCallback((rule: PromoRule) => {
    showConfirm({
      title: 'Nonaktifkan promo?',
      message: `Promo untuk "${rule.nama_produk}" akan dimatikan.`,
      confirmLabel: 'Nonaktifkan',
      confirmStyle: 'destructive',
      onConfirm: () => { void (async () => { await hapusPromoRule(rule.id); await muat(); })(); },
    });
  }, [muat]);

  const aktifRules = rules.filter((r) => r.is_active === 1);

  return (
    <>
      <Stack.Screen
        options={{
          title: mode === 'list' ? 'Program Promo' : 'Tambah Promo',
          headerRight: undefined,
          headerLeft: mode === 'form'
            ? () => (
              <Pressable onPress={kembaliKeList} hitSlop={12} style={styles.backBtn}>
                <Icon name="chevron-left" size={26} color={Colors.primary} strokeWidth={2.4} />
              </Pressable>
            )
            : undefined,
        }}
      />

      {mode === 'list' ? (
        <PromoList
          aktifRules={aktifRules}
          fabClearance={FAB_CLEARANCE}
          insets={insets}
          onBukaForm={bukaForm}
          onNonaktif={konfirmasiNonaktif}
        />
      ) : (
        <FormPromo
          menu={menu}
          tipe={tipe}
          menuItemId={menuItemId}
          mulai={mulai}
          selesai={selesai}
          error={error}
          errorField={errorField}
          saving={saving}
          onChangeTipe={setTipe}
          onChangeMenuId={setMenuItemId}
          onChangeMulai={setMulai}
          onChangeSelesai={setSelesai}
          onClearError={clearError}
          onSimpan={() => { void simpan(); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
