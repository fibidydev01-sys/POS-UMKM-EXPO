/**
 * icon.tsx — satu pintu untuk SEMUA ikon di aplikasi.
 *
 * KENAPA: menggantikan emoji (🏠 🛒 💰 …) dengan ikon vektor dari
 * `lucide-react-native` agar tampilan konsisten, tajam, dan "sangar".
 *
 * CARA PAKAI:
 *   <Icon name="home" size={22} color={Colors.primary} />
 *
 * Mapping nama → komponen lucide ada di tabel REGISTRY di bawah. Untuk
 * menambah ikon baru: impor dari 'lucide-react-native' lalu daftarkan namanya.
 *
 * CATATAN DEPENDENCY (tambahkan jika belum ada):
 *   npx expo install lucide-react-native react-native-svg
 */
import React from 'react';
import {
  Home, ShoppingCart, UtensilsCrossed, ReceiptText, Settings,
  Wallet, CalendarDays, TrendingUp, Undo2, Gift, Tag, Flame,
  Printer, Trash2, Plus, Minus, Check, ChevronRight, ChevronLeft,
  Search, PackageOpen, Save, KeyRound, Download, Upload, AlertTriangle,
  X, BadgePercent, Percent, Store, Phone, MapPin, FileText, Banknote,
  Smartphone, Landmark, CreditCard,
  type LucideIcon,
} from 'lucide-react-native';

/** Nama ikon yang tersedia di aplikasi. Tambah di sini bila perlu ikon baru. */
export type IconName =
  | 'home' | 'cart' | 'menu' | 'receipt' | 'settings'
  | 'wallet' | 'calendar' | 'trending-up' | 'undo' | 'gift' | 'tag' | 'flame'
  | 'printer' | 'trash' | 'plus' | 'minus' | 'check' | 'chevron-right' | 'chevron-left'
  | 'search' | 'empty-box' | 'save' | 'key' | 'download' | 'upload' | 'warning'
  | 'close' | 'badge-percent' | 'percent' | 'store' | 'phone' | 'map-pin' | 'file' | 'banknote'
  | 'smartphone' | 'landmark' | 'credit-card';

const REGISTRY: Record<IconName, LucideIcon> = {
  home: Home,
  cart: ShoppingCart,
  menu: UtensilsCrossed,
  receipt: ReceiptText,
  settings: Settings,
  wallet: Wallet,
  calendar: CalendarDays,
  'trending-up': TrendingUp,
  undo: Undo2,
  gift: Gift,
  tag: Tag,
  flame: Flame,
  printer: Printer,
  trash: Trash2,
  plus: Plus,
  minus: Minus,
  check: Check,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  search: Search,
  'empty-box': PackageOpen,
  save: Save,
  key: KeyRound,
  download: Download,
  upload: Upload,
  warning: AlertTriangle,
  close: X,
  'badge-percent': BadgePercent,
  percent: Percent,
  store: Store,
  phone: Phone,
  'map-pin': MapPin,
  file: FileText,
  banknote: Banknote,
  smartphone: Smartphone,
  landmark: Landmark,
  'credit-card': CreditCard,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Ketebalan garis lucide (default 2). 2.25–2.5 terlihat lebih tegas. */
  strokeWidth?: number;
  style?: any;
}

export default function Icon({ name, size = 22, color = '#000', strokeWidth = 2.25, style }: IconProps) {
  const Cmp = REGISTRY[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
