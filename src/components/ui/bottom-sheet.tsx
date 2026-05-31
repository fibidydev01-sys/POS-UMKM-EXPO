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
 *     semua pemanggil.
 *
 * TINGGI SERAGAM:
 *   Semua sheet di-lock ke SHEET_HEIGHT (90%). snapPoints prop diterima tapi
 *   DIABAIKAN — satu-satunya sumber kebenaran ada di konstanta ini. Dengan
 *   begitu SELURUH drawer di aplikasi punya tinggi yang sama persis, konsisten
 *   tanpa bergantung pada nilai yang dikirim pemanggil.
 *
 * POLA WAJIB DI APLIKASI INI (karena sheet native sulit ditumpuk):
 *   JANGAN menumpuk dua sheet. Untuk sub-layar (pilih diskon / form), pakai
 *   SATU sheet dengan TUKAR ISI (content swap) — lihat keranjang-panel.tsx,
 *   riwayat.tsx, pengaturan.tsx.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { Colors, FontSize, Spacing } from '../../constants/colors';

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
   * @deprecated Diabaikan. Semua sheet menggunakan SHEET_HEIGHT (90%) secara otomatis.
   * Prop ini hanya ada agar pemanggil lama tidak perlu diubah.
   */
  snapPoints?: SnapPoint[];
  /** Tampilkan tombol ✕ di header. Default: true. */
  showClose?: boolean;
  /** Bila true, isi dibungkus ScrollView. Default: false (View flex:1). */
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
  // snapPoints sengaja tidak didestructure — prop ini ada di interface tapi diabaikan.
  showClose = true,
  scrollable = false,
}: BottomSheetProps) {
  const ref = useRef<SheetMethods | null>(null);
  const insets = useSafeAreaInsets();

  // Deklaratif (visible) → imperatif (present/dismiss).
  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const hasHeader = !!(title || headerRight || showClose);

  return (
    <BottomSheetModal
      ref={ref as any}
      snapPoints={[SHEET_HEIGHT]}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onClose}
    >
      <BottomSheetView style={[styles.root, { paddingBottom: insets.bottom }]}>
        {hasHeader && (
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
            <View style={styles.headerRight}>
              {headerRight}
              {showClose && (
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={styles.closeBtn}
                  accessibilityLabel="Tutup"
                >
                  <Text style={styles.closeTxt}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {scrollable ? (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textMuted, lineHeight: 18 },
  body: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});