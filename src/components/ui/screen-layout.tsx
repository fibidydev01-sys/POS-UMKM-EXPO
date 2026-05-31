/**
 * screen-layout.tsx — KERANGKA HALAMAN yang konsisten.
 *
 * MASALAH yang diselesaikan:
 *   Sebelumnya tiap halaman menulis ulang header (judul + subjudul + tombol
 *   kanan) dengan padding/varian sendiri-sendiri → tidak konsisten & gampang
 *   konflik dengan elemen melayang (FAB, cart bar). Footer pun ditangani ad-hoc.
 *
 * SOLUSI (sejajar dengan BottomSheet):
 *   Komponen ini menyediakan STRUKTUR yang sama dengan drawer:
 *       ┌───────────────────────────────┐
 *       │ HEADER  (title, subtitle, →)  │  ← tetap, tidak ikut scroll
 *       ├───────────────────────────────┤
 *       │ BODY    (children / scroll)   │  ← area konten fleksibel
 *       ├───────────────────────────────┤
 *       │ FOOTER  (opsional)            │  ← tetap menempel di bawah
 *       └───────────────────────────────┘
 *
 *   Dengan begitu Halaman & Drawer memakai pola header/footer yang SAMA →
 *   rapi, konsisten, dan elemen melayang punya tempat yang jelas (footer slot
 *   atau lewat prop `floating`).
 *
 * CARA PAKAI:
 *   <ScreenLayout
 *     title="Kasir"
 *     subtitle="Pilih produk untuk mulai transaksi"
 *     headerRight={<...>}
 *     footer={<TombolBayar/>}      // opsional, menempel di bawah
 *     floating={<CartBar/>}        // opsional, melayang di atas footer/body
 *   >
 *     ...konten...
 *   </ScreenLayout>
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../constants/colors';

export interface ScreenLayoutProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  /** Footer tetap (mis. tombol aksi utama). Tidak ikut scroll. */
  footer?: React.ReactNode;
  /** Elemen melayang (mis. cart bar / FAB) — dirender absolut di dalam body. */
  floating?: React.ReactNode;
  children: React.ReactNode;
  /** Safe area edges. Default ['top']. Halaman tab cukup 'top'. */
  edges?: Edge[];
  /** Padding horizontal body (default Spacing.lg). 0 untuk full-bleed (FlatList). */
  bodyPadding?: number;
  style?: ViewStyle;
}

export default function ScreenLayout({
  title,
  subtitle,
  headerRight,
  footer,
  floating,
  children,
  edges = ['top'],
  bodyPadding = Spacing.lg,
  style,
}: ScreenLayoutProps) {
  const hasHeader = !!(title || subtitle || headerRight);

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {hasHeader && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
          {!!headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      <View style={[styles.body, { paddingHorizontal: bodyPadding }]}>
        {children}
        {/* Slot melayang: absolut, tidak mengganggu layout konten. */}
        {!!floating && floating}
      </View>

      {!!footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerText: { flex: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  body: { flex: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
});
