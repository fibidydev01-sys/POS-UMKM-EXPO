/**
 * pengaturan/tentang.tsx — Halaman Tentang Aplikasi.
 *
 * Wajib ada untuk Google Play review:
 *   - Nama & versi app
 *   - Developer & email support
 *   - Link ke Privacy Policy, ToS, EULA, Refund Policy
 *   - Link ke halaman Bantuan & FAQ
 *   - Link ke halaman Hapus Data Saya
 */
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { Colors, FontSize, Radii, Spacing, shadow } from '../../constants/colors';
import Icon from '../../components/ui/icon';
import type { IconName } from '../../components/ui/icon';

const BASE_LEGAL = 'https://legal-pos.fibidy.com';

const LEGAL_LINKS: { label: string; url: string }[] = [
  { label: 'Kebijakan Privasi',          url: `${BASE_LEGAL}/privacy-policy.html` },
  { label: 'Syarat & Ketentuan',         url: `${BASE_LEGAL}/terms-of-service.html` },
  { label: 'Perjanjian Lisensi (EULA)',  url: `${BASE_LEGAL}/eula.html` },
  { label: 'Kebijakan Pengembalian Dana',url: `${BASE_LEGAL}/refund-policy.html` },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LinkRow({
  label,
  icon = 'file',
  onPress,
  last = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      >
        <View style={styles.linkIcon}>
          <Icon name={icon} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.linkText}>{label}</Text>
        <Icon name="chevron-right" size={18} color={Colors.textMuted} />
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export default function TentangScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <Stack.Screen options={{ title: 'Tentang Aplikasi' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <View style={styles.heroIcon}>
            <Icon name="store" size={38} color={Colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.heroNama}>POS UMKM</Text>
          <Text style={styles.heroSub}>
            Kasir offline untuk warung, toko & kafe Indonesia
          </Text>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <InfoRow label="Versi" value={version} />
          <View style={styles.divider} />
          <InfoRow label="Developer" value="fibidy" />
          <View style={styles.divider} />
          <InfoRow label="Email Support" value="admin@fibidy.com" />
        </View>

        {/* Bantuan */}
        <Text style={styles.sectionLabel}>Bantuan</Text>
        <View style={styles.card}>
          <LinkRow
            label="FAQ & Bantuan"
            icon="search"
            onPress={() => router.push('/pengaturan/bantuan' as Href)}
          />
          <LinkRow
            label="Aktivasi & Lisensi"
            icon="key"
            onPress={() => router.push('/aktivasi' as Href)}
            last
          />
        </View>

        {/* Hukum & Kebijakan */}
        <Text style={styles.sectionLabel}>Hukum & Kebijakan</Text>
        <View style={styles.card}>
          {LEGAL_LINKS.map((item, i) => (
            <LinkRow
              key={item.url}
              label={item.label}
              icon="file"
              onPress={() => { void Linking.openURL(item.url); }}
              last={i === LEGAL_LINKS.length - 1}
            />
          ))}
        </View>

        {/* Data */}
        <Text style={styles.sectionLabel}>Data Saya</Text>
        <View style={styles.card}>
          <LinkRow
            label="Hapus Data Saya"
            icon="trash"
            onPress={() => router.push('/pengaturan/hapus-data' as Href)}
            last
          />
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg },

  heroWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroNama: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
    maxWidth: 260,
  },

  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...shadow(1),
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  infoLabel: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '700',
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  pressed: { backgroundColor: Colors.surfaceAlt },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});
