/**
 * BottomSheet — wrapper TIPIS di atas drop-in resmi Expo:
 *   `@expo/ui/community/bottom-sheet`.
 *
 * KENAPA INI (bukan gorhom, bukan Modal+PanResponder custom):
 *   - @expo/ui membungkus sheet NATIVE: Jetpack Compose (Android), SwiftUI (iOS),
 *     vaul (web). Gesture, animasi, backdrop, dan keyboard ditangani OS →
 *     paling stabil di New Architecture. Tidak ada PanResponder/worklet buatan
 *     sendiri yang bisa "diam-diam tidak render".
 *   - API komponen ini DIPERTAHANKAN sama seperti versi lama (visible, onClose,
 *     title, headerRight, snapPoints, scrollable, showClose) → drop-in untuk
 *     semua pemanggil.
 *
 * POLA WAJIB DI APLIKASI INI (karena sheet native sulit ditumpuk):
 *   JANGAN menumpuk dua sheet. Untuk sub-layar (pilih diskon / form), pakai
 *   SATU sheet dengan TUKAR ISI (content swap) — lihat keranjang-panel.tsx,
 *   riwayat.tsx, pengaturan.tsx. Tidak ada overlay absolut, tidak ada nested.
 *
 * Catatan native:
 *   - Handle (grabber) & backdrop digambar OS. enablePanDownToClose juga
 *     mengaktifkan tap-scrim & tombol back (Android) untuk menutup.
 *   - Header (judul + tombol ✕ + headerRight) digambar di sini, di dalam
 *     BottomSheetView, karena @expo/ui tidak menyediakan header.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { Colors, FontSize, Spacing } from '../../constants/colors';

type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Titik snap. NILAI PERTAMA = tinggi awal saat dibuka.
   *   'half'            → 55%
   *   'full'            → 92%
   *   { fraction: 0.7 } → 70%
   *   { height: 420 }   → 420px
   * Default: 'full'.
   */
  snapPoints?: SnapPoint[];
  /** Tampilkan tombol ✕ di header. Default: true. */
  showClose?: boolean;
  /** Bila true, isi dibungkus ScrollView. Default: false (View flex:1). */
  scrollable?: boolean;
}

/** Metode imperatif sheet @expo/ui (subset yang kita pakai). */
type SheetMethods = { present: () => void; dismiss: () => void };

function toSnap(sp?: SnapPoint[]): (string | number)[] {
  const list = sp && sp.length > 0 ? sp : ['full'];
  return list.map((p) => {
    if (p === 'full') return '92%';
    if (p === 'half') return '55%';
    if (typeof p === 'object' && 'fraction' in p) return `${Math.round(p.fraction * 100)}%`;
    if (typeof p === 'object' && 'height' in p) return p.height;
    return '92%';
  });
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  headerRight,
  children,
  snapPoints,
  showClose = true,
  scrollable = false,
}: BottomSheetProps) {
  const ref = useRef<SheetMethods | null>(null);
  const insets = useSafeAreaInsets();
  const snaps = useMemo(() => toSnap(snapPoints), [snapPoints]);

  // Deklaratif (visible) → imperatif (present/dismiss). present/dismiss saat
  // sudah dalam state itu = no-op, jadi aman dipanggil berulang.
  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const hasHeader = !!(title || headerRight || showClose);

  return (
    <BottomSheetModal
      ref={ref as any}
      snapPoints={snaps}
      enableDynamicSizing={false}
      enablePanDownToClose
      // User tutup lewat swipe / scrim / back → sinkron balik ke state parent.
      onDismiss={onClose}
    >
      <BottomSheetView style={[styles.root, { paddingBottom: insets.bottom }]}>
        {hasHeader && (
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
            <View style={styles.headerRight}>
              {headerRight}
              {showClose && (
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Tutup">
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
  // BottomSheetView dibatasi tinggi snap oleh sheet native → flex:1 mengisi penuh.
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
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textMuted, lineHeight: 18 },
  body: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
