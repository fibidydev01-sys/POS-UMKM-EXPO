import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
// SDK 56: expo-router tidak lagi izinkan import dari @react-navigation/* di kode app.
// Hook ini sekarang di-re-export dari 'expo-router/js-tabs' (runtime API sama persis).
import { useBottomTabBarHeight } from 'expo-router/js-tabs';

import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import { formatRupiah } from '../../lib/utils/currency';
import type {
  MenuItem, CartItem, UmkmConfig, Transaksi, TransactionItem, DiskonPreset,
  PromoRule, PaymentMethod, Kategori,
} from '../../lib/db/database';
import { getMenuTersedia, getKategori } from '../../lib/db/menu';
import { getDiskonPreset } from '../../lib/db/diskon-preset';
import { simpanTransaksi, getItemsByTransaksi, getTransaksiById } from '../../lib/db/transaksi';
import { getConfig } from '../../lib/db/pengaturan';
import { getPromoAktif } from '../../lib/db/promo-rule';
import { applyPromo, hitungGrandTotal } from '../../lib/cart/promo-engine';
import { features } from '../../lib/config/features';
import { cetakStruk, connectPrinter, getPairedDevices, printerTersedia } from '../../lib/printer/struk';

import ScreenLayout from '../../components/ui/screen-layout';
import MenuList from '../../components/kasir/menu-list';
import KeranjangPanel from '../../components/kasir/keranjang-panel';
import StrukPreview from '../../components/kasir/struk-preview';
import KategoriList from '../../components/menu/kategori-list';
import EmptyState from '../../components/shared/empty-state';

export default function KasirScreen() {
  // Tinggi tab bar NYATA dari navigator (bukan tebakan konstanta). Ini yang
  // membuat cart bar nempel rapi tepat di atas mobile nav, tidak loncat.
  const tabBarHeight = useBottomTabBarHeight();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [presets, setPresets] = useState<DiskonPreset[]>([]);
  const [promoRules, setPromoRules] = useState<PromoRule[]>([]);
  const [kategoriAktif, setKategoriAktif] = useState<number | null>(null);
  const [config, setConfig] = useState<UmkmConfig | null>(null);

  const [cartRaw, setCartRaw] = useState<CartItem[]>([]);

  const [diskonPresetId, setDiskonPresetId] = useState<number | null>(null);
  const [diskonPersen, setDiskonPersen] = useState(0);

  const [keranjangBuka, setKeranjangBuka] = useState(false);

  const [trxSelesai, setTrxSelesai] = useState<Transaksi | null>(null);
  const [itemsSelesai, setItemsSelesai] = useState<TransactionItem[]>([]);
  const [strukBuka, setStrukBuka] = useState(false);
  const [mencetak, setMencetak] = useState(false);

  const muat = useCallback(async () => {
    const [m, k, c, p, promo] = await Promise.all([
      getMenuTersedia(),
      getKategori(),
      getConfig(),
      getDiskonPreset(),
      features.promoEngine ? getPromoAktif() : Promise.resolve([] as PromoRule[]),
    ]);
    setMenu(m);
    setKategori(k);
    setConfig(c);
    setPresets(p);
    setPromoRules(promo);
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  const cart = useMemo(
    () => (features.promoEngine ? applyPromo(cartRaw, promoRules) : cartRaw),
    [cartRaw, promoRules]
  );

  const menuTampil = useMemo(
    () => (kategoriAktif === null ? menu : menu.filter((m) => m.kategori_id === kategoriAktif)),
    [menu, kategoriAktif]
  );

  const qtyMap = useMemo(() => {
    const map: Record<number, number> = {};
    cartRaw.forEach((c) => { if (c.menu_item_id != null) map[c.menu_item_id] = c.qty; });
    return map;
  }, [cartRaw]);

  const grandTotal = useMemo(
    () => hitungGrandTotal(cart, diskonPersen).grandTotal,
    [cart, diskonPersen]
  );
  const totalQty = useMemo(() => cartRaw.reduce((s, c) => s + c.qty, 0), [cartRaw]);

  // ── Aksi keranjang ──
  const tambah = (item: MenuItem) => {
    setCartRaw((prev) => {
      const idx = prev.findIndex((c) => c.menu_item_id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, {
        menu_item_id: item.id,
        nama_produk: item.nama,
        harga_satuan: item.harga,
        qty: 1,
        diskon_preset_id: null,
        diskon_persen: 0,
      }];
    });
  };

  const ubahQty = (menuItemId: number | null, nama: string, delta: number) => {
    setCartRaw((prev) =>
      prev
        .map((c) => {
          const cocok = c.menu_item_id === menuItemId && c.nama_produk === nama;
          return cocok ? { ...c, qty: c.qty + delta } : c;
        })
        .filter((c) => c.qty > 0)
    );
  };

  const kurang = (item: MenuItem) => ubahQty(item.id, item.nama, -1);

  // Dipertahankan agar kompat; tidak lagi dipakai tombol "Kosongkan" (dihapus).
  const kosongkan = () => {
    setCartRaw([]);
    setDiskonPresetId(null);
    setDiskonPersen(0);
    setKeranjangBuka(false);
  };

  function handleDiskonChange(presetId: number | null, persen: number) {
    setDiskonPresetId(presetId);
    setDiskonPersen(persen);
  }

  // ── Bayar ──
  const bayar = async (paymentMethod: PaymentMethod, uangDiterima: number | null) => {
    if (cartRaw.length === 0) return;
    try {
      const hasil = await simpanTransaksi({
        items: cart,
        diskonPresetId,
        diskonPersen,
        paymentMethod,
        uangDiterima,
      });
      const [trx, items] = await Promise.all([
        getTransaksiById(hasil.transaksiId),
        getItemsByTransaksi(hasil.transaksiId),
      ]);
      setTrxSelesai(trx);
      setItemsSelesai(items);
      setKeranjangBuka(false);
      setStrukBuka(true);
      setCartRaw([]);
      setDiskonPresetId(null);
      setDiskonPersen(0);
    } catch {
      Alert.alert('Gagal', 'Transaksi gagal disimpan. Coba lagi.');
    }
  };

  // ── Cetak ──
  const cetak = async () => {
    if (!config || !trxSelesai) return;
    if (!printerTersedia()) {
      Alert.alert('Printer tidak tersedia', 'Cetak struk hanya berjalan di build Android dengan printer bluetooth.');
      return;
    }
    setMencetak(true);
    try {
      const devices = await getPairedDevices();
      if (devices.length === 0) {
        Alert.alert('Printer tidak ditemukan', 'Pair printer thermal di pengaturan Bluetooth HP terlebih dahulu.');
        return;
      }
      const ok = await connectPrinter(devices[0].address);
      if (!ok) { Alert.alert('Gagal terhubung', 'Periksa Bluetooth dan coba lagi.'); return; }
      const res = await cetakStruk(config, trxSelesai, itemsSelesai);
      if (!res.ok) Alert.alert('Gagal cetak', res.pesan);
    } finally {
      setMencetak(false);
    }
  };

  // Cart bar didock TEPAT di atas tab bar memakai tinggi NYATA tab bar.
  const cartBarBottom = tabBarHeight + Spacing.sm;

  // Bar keranjang melayang — nempel rapi di atas tab bar (mobile nav).
  const cartBar = (cartRaw.length > 0 && !keranjangBuka) ? (
    <Pressable
      onPress={() => setKeranjangBuka(true)}
      style={({ pressed }) => [styles.cartBar, { bottom: cartBarBottom }, pressed && styles.cartPressed]}
    >
      <View style={styles.cartBadge}>
        <Text style={styles.cartBadgeTeks}>{totalQty}</Text>
      </View>
      <Text style={styles.cartLabel}>Lihat Keranjang</Text>
      <Text style={styles.cartTotal}>{formatRupiah(grandTotal)}</Text>
    </Pressable>
  ) : null;

  return (
    <ScreenLayout
      title="Kasir"
      subtitle="Pilih produk untuk mulai transaksi"
      bodyPadding={0}
      floating={cartBar}
    >
      {menu.length === 0 ? (
        <EmptyState
          icon="menu"
          judul="Belum ada produk"
          deskripsi="Tambahkan produk di tab Menu agar bisa mulai berjualan."
        />
      ) : (
        <>
          {kategori.length > 0 && (
            <View style={styles.kategoriBar}>
              <KategoriList kategori={kategori} aktif={kategoriAktif} onPilih={setKategoriAktif} />
            </View>
          )}

          {menuTampil.length === 0 ? (
            <EmptyState
              icon="search"
              judul="Tidak ada di kategori ini"
              deskripsi="Pilih kategori lain untuk melihat produk yang tersedia."
            />
          ) : (
            <MenuList
              items={menuTampil}
              qtyMap={qtyMap}
              onTambah={tambah}
              onKurang={kurang}
              bottomInset={tabBarHeight + 72}
            />
          )}
        </>
      )}

      <KeranjangPanel
        visible={keranjangBuka}
        cart={cart}
        cartRaw={cartRaw}
        presets={presets}
        diskonPresetId={diskonPresetId}
        diskonPersen={diskonPersen}
        onTutup={() => setKeranjangBuka(false)}
        onUbahQty={ubahQty}
        onUbahDiskon={handleDiskonChange}
        onBayar={bayar}
        onKosongkan={kosongkan}
      />

      <StrukPreview
        visible={strukBuka}
        config={config}
        trx={trxSelesai}
        items={itemsSelesai}
        mencetak={mencetak}
        onCetak={cetak}
        onSelesai={() => setStrukBuka(false)}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  kategoriBar: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
  cartBar: {
    position: 'absolute', left: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
    gap: Spacing.md,
    ...shadow(3),
    zIndex: 20,
    elevation: 12,
  },
  cartPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', minWidth: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  cartBadgeTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.sm },
  cartLabel: { flex: 1, color: Colors.onPrimary, fontWeight: '700', fontSize: FontSize.md },
  cartTotal: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.lg },
});
