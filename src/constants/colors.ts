/**
 * Design tokens — "Warung Modern".
 *
 * Palet hangat (terracotta + netral krem) yang cocok untuk aplikasi kasir UMKM
 * Indonesia: ramah, jelas, kontras cukup untuk dipakai di bawah sinar matahari.
 *
 * Semua token di bawah dipakai langsung oleh komponen. Jangan menghapus key
 * tanpa memperbarui pemakainya.
 */

import { Platform, ViewStyle } from 'react-native';

export const Colors = {
  // Latar
  bg: '#FBF7F2',          // krem sangat muda (background layar)
  surface: '#FFFFFF',     // kartu / panel
  surfaceAlt: '#F2ECE4',  // input / chip / area sekunder

  // Brand (terracotta hangat)
  primary: '#C75B39',
  primaryDark: '#A8431F',
  primarySoft: '#F7E2D8',
  onPrimary: '#FFFFFF',

  // Aksen (teal hangat sebagai pelengkap)
  accent: '#2E7D6F',

  // Teks
  text: '#2B2018',
  textMuted: '#7A6F65',
  textSubtle: '#A89C90',

  // Garis
  border: '#EAE0D6',
  borderStrong: '#D2C5B8',

  // Status
  success: '#2E7D32',
  successSoft: '#E3F1E4',
  danger: '#C0392B',
  dangerSoft: '#F8E3E0',
  warning: '#B7791F',
  warningSoft: '#FBEFD8',

  // Lain
  overlay: 'rgba(28, 20, 14, 0.45)',
  shadow: '#3A2A1C',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

/**
 * shadow(level) — bayangan konsisten lintas platform.
 * level 1 = halus, 2 = sedang, 3 = menonjol (FAB / bar melayang).
 */
export function shadow(level: 1 | 2 | 3): ViewStyle {
  const map = {
    1: { radius: 6, y: 2, opacity: 0.08, elevation: 2 },
    2: { radius: 12, y: 4, opacity: 0.12, elevation: 6 },
    3: { radius: 20, y: 8, opacity: 0.16, elevation: 12 },
  } as const;
  const s = map[level];
  return Platform.select({
    ios: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: s.y },
      shadowOpacity: s.opacity,
      shadowRadius: s.radius,
    },
    android: { elevation: s.elevation },
    default: {},
  }) as ViewStyle;
}
