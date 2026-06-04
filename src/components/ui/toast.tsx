/**
 * toast.tsx — Toast / banner in-app (React Native Animated, ZERO dependency).
 *
 * KENAPA BUKAN @expo/ui: SDK 56 @expo/ui TIDAK menyediakan komponen Toast/Snackbar.
 * Jadi untuk feedback instan DI DALAM app (mis. "Stok berhasil ditambah"), kita
 * pakai komponen RN custom — konsisten dengan pola Modal custom lain di app ini
 * (struk-preview.tsx, dialog-qris.tsx) dan tidak menambah surface dependency.
 *
 * BEDA dengan notifikasi OS (expo-notifications):
 *   - Toast = banner DI DALAM app, hidup saat app dibuka. Untuk konfirmasi aksi.
 *   - Notifikasi OS = muncul di status bar / lock screen, hidup walau app ditutup.
 *
 * CARA PAKAI:
 *   1. Bungkus app dengan <ToastProvider> (di app/_layout.tsx).
 *   2. Di komponen mana pun:
 *        const toast = useToast();
 *        toast.show('Stok kopi ditambah 20', { tipe: 'success' });
 *
 * Aman dipakai bareng SafeArea & sheet native — Toast dirender di lapisan paling
 * atas via absolute positioning di dalam provider (bukan Modal, agar tidak
 * bentrok dengan BottomSheet native).
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { Animated, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from './icon';

export type ToastTipe = 'success' | 'info' | 'warning' | 'error';

// Nama ikon yang dipakai toast — semuanya sudah tersedia di registry ikon app.
// Diketik lokal agar tidak bergantung pada export type IconName dari ./icon.
type ToastIcon = 'check' | 'tag' | 'warning' | 'close';

export interface ToastOptions {
  tipe?: ToastTipe;
  /** Durasi tampil dalam ms (default 2600). */
  durasi?: number;
}

interface ToastState {
  id: number;
  pesan: string;
  tipe: ToastTipe;
  durasi: number;
}

interface ToastContextValue {
  show: (pesan: string, options?: ToastOptions) => void;
  success: (pesan: string, durasi?: number) => void;
  info: (pesan: string, durasi?: number) => void;
  warning: (pesan: string, durasi?: number) => void;
  error: (pesan: string, durasi?: number) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const META: Record<ToastTipe, { icon: ToastIcon; bg: string; fg: string; iconColor: string }> = {
  success: { icon: 'check', bg: Colors.successSoft, fg: Colors.success, iconColor: Colors.success },
  info: { icon: 'tag', bg: Colors.primarySoft, fg: Colors.primaryDark, iconColor: Colors.primary },
  warning: { icon: 'warning', bg: Colors.warningSoft, fg: Colors.warning, iconColor: Colors.warning },
  error: { icon: 'warning', bg: Colors.dangerSoft, fg: Colors.danger, iconColor: Colors.danger },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const animateOut = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setToast(null);
      cb?.();
    });
  }, [opacity, translateY]);

  const hide = useCallback(() => {
    clearTimer();
    animateOut();
  }, [animateOut, clearTimer]);

  const show = useCallback((pesan: string, options?: ToastOptions) => {
    const next: ToastState = {
      id: ++seq.current,
      pesan,
      tipe: options?.tipe ?? 'info',
      durasi: options?.durasi ?? 2600,
    };
    clearTimer();
    setToast(next);

    // Reset posisi lalu animasikan masuk.
    opacity.setValue(0);
    translateY.setValue(-20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
    ]).start();

    timer.current = setTimeout(() => animateOut(), next.durasi);
  }, [animateOut, clearTimer, opacity, translateY]);

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (p, d) => show(p, { tipe: 'success', durasi: d }),
    info: (p, d) => show(p, { tipe: 'info', durasi: d }),
    warning: (p, d) => show(p, { tipe: 'warning', durasi: d }),
    error: (p, d) => show(p, { tipe: 'error', durasi: d }),
    hide,
  }), [show, hide]);

  const meta = toast ? META[toast.tipe] : META.info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + Spacing.sm }]}>
          <Animated.View
            style={[
              styles.toast,
              { backgroundColor: meta.bg, opacity, transform: [{ translateY }] },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
              <Icon name={meta.icon} size={18} color={meta.iconColor} strokeWidth={2.6} />
            </View>
            <Text style={[styles.teks, { color: meta.fg }]} numberOfLines={3}>
              {toast.pesan}
            </Text>
            <Pressable onPress={hide} hitSlop={8} style={styles.closeBtn}>
              <Icon name="close" size={16} color={meta.fg} strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

/**
 * Hook akses Toast. Aman dipanggil walau provider belum terpasang (no-op),
 * supaya tidak meledak di skenario testing / render parsial.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  const noop = () => {};
  return {
    show: noop,
    success: noop,
    info: noop,
    warning: noop,
    error: noop,
    hide: noop,
  };
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...shadow(3),
    ...(Platform.OS === 'android' ? { elevation: 12 } : null),
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  teks: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', lineHeight: 19 },
  closeBtn: { padding: 2 },
});
