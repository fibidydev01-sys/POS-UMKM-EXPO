import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '../../constants/colors';

/** Tab icon berbasis emoji — ringan, tanpa dependency icon set. */
function TabIcon({ emoji, color, focused }: { emoji: string; color: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  );
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
        options={{ title: 'Beranda', tabBarIcon: (p) => <TabIcon emoji="🏠" {...p} /> }}
      />
      <Tabs.Screen
        name="kasir"
        options={{ title: 'Kasir', tabBarIcon: (p) => <TabIcon emoji="🛒" {...p} /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: (p) => <TabIcon emoji="🍽️" {...p} /> }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{ title: 'Riwayat', tabBarIcon: (p) => <TabIcon emoji="🧾" {...p} /> }}
      />
      <Tabs.Screen
        name="pengaturan"
        options={{ title: 'Pengaturan', tabBarIcon: (p) => <TabIcon emoji="⚙️" {...p} /> }}
      />
    </Tabs>
  );
}
