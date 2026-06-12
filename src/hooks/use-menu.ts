/**
 * use-menu.ts — state + actions untuk tab Menu.
 *
 * SETELAH REFACTOR PAGE-BASED:
 *   State & actions yang DIPINDAH ke halaman masing-masing:
 *     - formVisible, itemEdit → menu/tambah-produk.tsx
 *     - katVisible, namaKatBaru, simpanKategori, konfirmasiHapusKategori → menu/kategori.tsx
 *     - stokVisible → menu/stok.tsx
 *
 *   Yang TETAP di hook ini (dipakai oleh tab menu.tsx):
 *     - kategori, menu, filter (list & filter)
 *     - namaKategoriMap, menuTampil (computed)
 *     - ubahTersedia (toggle langsung dari kartu)
 *     - muat (refresh setelah kembali dari halaman edit)
 *
 * Lapis 3 tidak ada di hook ini — sudah bersih.
 */
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useToast } from '../components/ui/toast';
import type { Kategori, MenuItem } from '../lib/db/database';
import { getKategori, getMenuItems, toggleTersedia } from '../lib/db/menu';

export interface MenuHookResult {
  // Data
  kategori: Kategori[];
  menu: MenuItem[];
  filter: number | null;
  // Computed
  namaKategoriMap: Map<number, string>;
  menuTampil: MenuItem[];
  // Actions
  muat: () => Promise<void>;
  setFilter: (id: number | null) => void;
  ubahTersedia: (item: MenuItem, isAvailable: boolean) => Promise<void>;
}

export function useMenu(): MenuHookResult {
  const toast = useToast();

  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [filter, setFilter] = useState<number | null>(null);

  const muat = useCallback(async () => {
    const [k, m] = await Promise.all([getKategori(), getMenuItems()]);
    setKategori(k);
    setMenu(m);
  }, []);

  // Reload setiap kali tab menu kembali ke fokus (setelah user balik dari halaman edit)
  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat])
  );

  const namaKategoriMap = useMemo(() => {
    const map = new Map<number, string>();
    kategori.forEach((k) => map.set(k.id, k.nama));
    return map;
  }, [kategori]);

  const menuTampil = useMemo(
    () => filter == null ? menu : menu.filter((m) => m.kategori_id === filter),
    [menu, filter]
  );

  const ubahTersedia = useCallback(
    async (item: MenuItem, isAvailable: boolean) => {
      // Optimistic update
      setMenu((prev) =>
        prev.map((m) => m.id === item.id ? { ...m, is_available: isAvailable ? 1 : 0 } : m)
      );
      await toggleTersedia(item.id, isAvailable);
      toast.info(`${item.nama} ${isAvailable ? 'tersedia' : 'disembunyikan'}`);
    },
    [toast]
  );

  return {
    kategori,
    menu,
    filter,
    namaKategoriMap,
    menuTampil,
    muat,
    setFilter,
    ubahTersedia,
  };
}
