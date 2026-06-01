import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorValue } from 'react-native';
import { Colors, FontSize } from '../../constants/colors';
import type { IconName } from '../../components/ui/icon';
import Icon from '../../components/ui/icon';

/** Tab icon berbasis lucide — tajam, konsisten dengan ikon lain di app. */
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return <Icon name={name} size={focused ? 24 : 22} color={color as string} strokeWidth={focused ? 2.6 : 2.2} />;
}

/**
 * Tab bar bawah. Tinggi & padding bawah dihitung dari insets.bottom (Safe Area)
 * agar tidak tertimpa gesture bar / tombol navigasi sistem.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE = 60;

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
      <Tabs.Screen
        name="index"
        options={{ title: 'Beranda', tabBarIcon: (p) => <TabIcon name="home" {...p} /> }}
      />
      <Tabs.Screen
        name="kasir"
        options={{ title: 'Kasir', tabBarIcon: (p) => <TabIcon name="cart" {...p} /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: (p) => <TabIcon name="menu" {...p} /> }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{ title: 'Riwayat', tabBarIcon: (p) => <TabIcon name="receipt" {...p} /> }}
      />
      <Tabs.Screen
        name="pengaturan"
        options={{ title: 'Pengaturan', tabBarIcon: (p) => <TabIcon name="settings" {...p} /> }}
      />
    </Tabs>
  );
}
