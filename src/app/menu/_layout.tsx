/**
 * menu/_layout.tsx — Stack navigator untuk sub-pages Menu.
 *
 * Sama persis pola dengan pengaturan/_layout.tsx:
 *   - Back button kiri native
 *   - Header bg krem (Colors.bg)
 *   - Shadow hilang
 *   - Tint primary
 */
import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function MenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Menu',
        headerStyle: { backgroundColor: Colors.bg },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '800', color: Colors.text },
        contentStyle: { backgroundColor: Colors.bg },
      }}
    />
  );
}
