/**
 * screen-layout.tsx — KERANGKA HALAMAN yang konsisten.
 *
 * PERUBAHAN Phase 5.2:
 *   - Tambah `pointerEvents="box-none"` pada View body agar elemen
 *     floating (FAB, cart bar) tidak terblokir oleh container body.
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
  footer?: React.ReactNode;
  floating?: React.ReactNode;
  children: React.ReactNode;
  edges?: Edge[];
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
            {!!title && (
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            )}
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}
          </View>
          {!!headerRight && (
            <View style={styles.headerRight}>{headerRight}</View>
          )}
        </View>
      )}

      {/* pointerEvents="box-none": View tidak meng-intercept touch,
          tapi children (termasuk floating) tetap menerima touch.
          Ini penting agar cart bar & FAB bisa ditekan. */}
      <View
        style={[styles.body, { paddingHorizontal: bodyPadding }]}
        pointerEvents="box-none"
      >
        {children}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
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
