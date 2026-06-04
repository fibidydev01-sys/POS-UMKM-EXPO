/**
 * BottomSheet — wrapper TIPIS di atas drop-in resmi Expo:
 *   `@expo/ui/community/bottom-sheet`.
 *
 * KENAPA INI (bukan gorhom, bukan Modal+PanResponder custom):
 *   - @expo/ui membungkus sheet NATIVE: Jetpack Compose (Android), SwiftUI (iOS),
 *     vaul (web). Gesture, animasi, backdrop, dan keyboard ditangani OS →
 *     paling stabil di New Architecture.
 *   - API komponen ini DIPERTAHANKAN sama seperti versi lama (visible, onClose,
 *     title, headerRight, snapPoints, scrollable, showClose) → drop-in untuk
 *     semua pemanggil. Ditambah satu prop opsional baru: `footer`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PERBAIKAN SCROLL (PENTING — root cause bug "isi tenggelam / tak bisa scroll"):
 *   Pada SDK 56, sheet @expo/ui di Android adalah Jetpack Compose ModalBottomSheet.
 *   Gesture drag-vertikal DIKONSUMSI oleh sheet native, sehingga ScrollView /
 *   FlatList React Native BIASA yang diletakkan di dalam <BottomSheetView> TIDAK
 *   bisa di-scroll (gesture tidak sampai ke scroller). Ini perilaku yang
 *   terdokumentasi; lihat expo/expo#46379.
 *
 *   SOLUSI RESMI: gunakan komponen scroll yang DI-RE-EXPORT oleh paket ini —
 *   BottomSheetScrollView / BottomSheetFlatList / BottomSheetSectionList /
 *   BottomSheetTextInput — yang sudah menangani koordinasi scroll di dalam
 *   sheet native. Wrapper ini memakai BottomSheetScrollView untuk BODY, lalu
 *   me-re-export keempat komponen itu agar drawer lain memakainya juga
 *   (mengganti import ScrollView/FlatList biasa).
 * ───────────────────────────────────────────────────────────────────────────
 *
 * STRUKTUR TIGA-ZONA (sesuai desain: header & footer STICKY, body SCROLL):
 *       ┌───────────────────────────────┐
 *       │ HEADER  (title, →)  STICKY     │  ← tidak ikut scroll
 *       ├───────────────────────────────┤
 *       │ BODY    (BottomSheetScrollView)│  ← satu-satunya area yang scroll
 *       ├───────────────────────────────┤
 *       │ FOOTER  (opsional)  STICKY     │  ← tetap menempel di bawah
 *       └───────────────────────────────┘
 *
 *   - Header & footer adalah SIBLING dari body (di luar scroller) sehingga
 *     mereka TETAP DIAM saat body di-scroll — inilah arti "sticky by design".
 *   - `scrollable` (default true): body dibungkus BottomSheetScrollView.
 *     Set `scrollable={false}` bila konten mengelola scroll-nya sendiri
 *     (mis. memakai BottomSheetFlatList langsung sebagai children).
 *
 * PERUBAHAN v3:
 *   - TOMBOL SILANG (✕) DIHAPUS dari semua drawer. showClose default = false.
 *     Tutup drawer cukup lewat gesture pan-down / back button (perilaku native).
 *   - BACKGROUND TRANSPARAN: root & body tidak memakai Colors.bg agar isi
 *     menyatu dengan warna sheet native (tidak ada "kotak warna" di dalam drawer).
 *
 * TINGGI SERAGAM:
 *   Semua sheet di-lock ke SHEET_HEIGHT (90%). snapPoints prop diterima tapi
 *   DIABAIKAN — satu-satunya sumber kebenaran ada di konstanta ini.
 *
 * POLA WAJIB DI APLIKASI INI (karena sheet native sulit ditumpuk):
 *   JANGAN menumpuk dua sheet. Untuk sub-layar (pilih diskon / form), pakai
 *   SATU sheet dengan TUKAR ISI (content swap) — lihat keranjang-panel.tsx,
 *   riwayat.tsx, pengaturan.tsx.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
} from '@expo/ui/community/bottom-sheet';
import { Colors, FontSize, Spacing } from '../../constants/colors';

/**
 * Re-export komponen scroll-aware dari @expo/ui. Drawer lain meng-import dari
 * SINI (bukan dari 'react-native') agar scroll & input bekerja di dalam sheet
 * native. Lihat penjelasan "PERBAIKAN SCROLL" di atas.
 */
export {
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetSectionList,
  BottomSheetTextInput,
} from '@expo/ui/community/bottom-sheet';

/** Tinggi TUNGGAL untuk semua drawer di aplikasi ini. Ubah di sini = ubah semua. */
const SHEET_HEIGHT = '90%';

// Tipe ini dipertahankan untuk kompatibilitas pemanggil yang masih mengirim snapPoints.
// Nilainya DIABAIKAN oleh wrapper — hanya ada untuk mencegah error TypeScript.
type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Footer STICKY (tidak ikut scroll). Mis. tombol aksi utama (Bayar/Simpan).
   * Opsional — bila tidak diisi, tidak ada footer (perilaku lama tetap sama).
   */
  footer?: React.ReactNode;
  /**
   * @deprecated Diabaikan. Semua sheet menggunakan SHEET_HEIGHT (90%) secara otomatis.
   * Prop ini hanya ada agar pemanggil lama tidak perlu diubah.
   */
  snapPoints?: SnapPoint[];
  /**
   * Tampilkan tombol ✕ di header. Default: FALSE (tombol silang sudah dihapus
   * dari seluruh aplikasi). Biarkan default — jangan set true.
   */
  showClose?: boolean;
  /**
   * Bila true (DEFAULT), body dibungkus BottomSheetScrollView (area scroll
   * tunggal). Set false bila konten mengelola scroll sendiri (mis. memberi
   * BottomSheetFlatList sebagai children).
   */
  scrollable?: boolean;
}

/** Metode imperatif sheet @expo/ui (subset yang kita pakai). */
type SheetMethods = { present: () => void; dismiss: () => void };

export default function BottomSheet({
  visible,
  onClose,
  title,
  headerRight,
  children,
  footer,
  // snapPoints & showClose sengaja tidak didestructure — ada di interface tapi diabaikan.
  scrollable = true,
}: BottomSheetProps) {
  const ref = useRef<SheetMethods | null>(null);
  const insets = useSafeAreaInsets();

  // Deklaratif (visible) → imperatif (present/dismiss).
  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const hasHeader = !!(title || headerRight);
  const hasFooter = !!footer;

  // Ref komponen sheet native tidak diekspos tipenya secara publik; cast aman.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modalRef = ref as any;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={[SHEET_HEIGHT]}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onClose}
    >
      {/* paddingBottom Safe Area dipindah ke footer/body terbawah agar tidak
          memotong area scroll & footer tetap di atas gesture bar. */}
      <BottomSheetView style={styles.root}>
        {hasHeader && (
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
            {!!headerRight && <View style={styles.headerRight}>{headerRight}</View>}
          </View>
        )}

        {/* BODY: satu-satunya area scroll. Memakai BottomSheetScrollView agar
            gesture scroll bekerja di dalam sheet native (lihat #46379). */}
        {scrollable ? (
          <BottomSheetScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.scrollContent,
              // Bila tak ada footer, beri ruang Safe Area di akhir konten.
              !hasFooter && { paddingBottom: insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}

        {/* FOOTER STICKY: sibling dari body → tidak ikut scroll. */}
        {hasFooter && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            {footer}
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // TRANSPARAN: warna sheet ditentukan oleh komponen native @expo/ui.
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: { flex: 1, fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  body: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
