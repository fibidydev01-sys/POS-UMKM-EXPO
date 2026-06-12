/**
 * (tabs)/_layout.tsx — Tab bar bawah, 5 slot.
 *
 * Struktur BARU:
 *   [ Beranda ] [ Menu ] [ ⓜ Kasir FAB ] [ Riwayat ] [ Pengaturan ]
 *
 * Slot ke-3 (Kasir):
 *   - Tombol bulat menonjol ke atas (FAB) di tengah.
 *   - Icon cart, warna primary.
 *   - Route NYATA ke (tabs)/kasir.tsx.
 *
 * Slot ke-2 (Menu):
 *   - Tab biasa dengan icon menu.
 *   - Route ke (tabs)/menu.tsx.
 */
import { Tabs, Redirect } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { Colors, FontSize, shadow } from '../../constants/colors';
import type { IconName } from '../../components/ui/icon';
import Icon from '../../components/ui/icon';
import { features } from '../../lib/config/features';
import { aktivasiEnabled } from '../../lib/config/staging-flags';

function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return <Icon name={name} size={focused ? 24 : 22} color={color as string} strokeWidth={focused ? 2.6 : 2.2} />;
}

/**
 * KasirFabButton — tombol tab Kasir yang tampil sebagai lingkaran menonjol.
 */
function KasirFabButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fabWrap, pressed && styles.fabPressed]}
      hitSlop={6}
    >
      <View style={styles.fab}>
        <Icon name="cart" size={26} color={Colors.onPrimary} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE = 60;

  if (aktivasiEnabled() && features.locked) {
    return <Redirect href="/aktivasi" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          zIndex: 10,
        },
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: '700' },
      }}
    >
      {/* 1. Beranda */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: (p) => <TabIcon name="home" {...p} />,
        }}
      />

      {/* 2. Menu */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: (p) => <TabIcon name="menu" {...p} />,
        }}
      />

      {/*
       * 3. Kasir — bulat menonjol di tengah tab bar.
       * tabBarButton override slot ini dengan KasirFabButton.
       * Route NYATA → (tabs)/kasir.tsx.
       */}
      <Tabs.Screen
        name="kasir"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: (props) => <KasirFabButton {...props} />,
        }}
      />

      {/* 4. Riwayat */}
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: (p) => <TabIcon name="receipt" {...p} />,
        }}
      />

      {/* 5. Pengaturan */}
      <Tabs.Screen
        name="pengaturan"
        options={{
          title: 'Pengaturan',
          tabBarIcon: (p) => <TabIcon name="settings" {...p} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    ...shadow(3),
  },
});