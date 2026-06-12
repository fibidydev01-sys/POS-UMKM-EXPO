/**
 * (tabs)/pengaturan.tsx — Tab Pengaturan.
 *
 *
 * Routing lengkap:
 *   /pengaturan/profil
 *   /pengaturan/lebar-kertas
 *   /pengaturan/preset-diskon
 *   /pengaturan/keamanan
 *   /pengaturan/backup
 *   /pengaturan/notifikasi   (inventory)
 *   /pengaturan/promo        (promoManagement)
 *   /pengaturan/tentang  (bantuan, hapus-data, aktivasi ada di dalam)
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Colors, Radii, Spacing, shadow } from '../../constants/colors';
import { features } from '../../lib/config/features';
import ScreenLayout from '../../components/ui/screen-layout';
import SectionHeader from '../../components/ui/section-header';
import NavRow from '../../components/pengaturan/nav-row';
import VersionSwitcher from '../../components/pengaturan/version-switcher';

export default function PengaturanScreen() {
  const router = useRouter();

  return (
    <ScreenLayout
      title="Pengaturan"
      subtitle="Usaha, struk, dan data"
      bodyPadding={0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* DEV-ONLY: staging panel */}
        <View style={styles.devWrap}>
          <VersionSwitcher />
        </View>

        {/* ── USAHA ── */}
        <SectionHeader label="Usaha" />
        <View style={styles.group}>
          <NavRow
            icon="store"
            title="Profil Usaha"
            subtitle="Nama, alamat, telepon, footer struk"
            onPress={() => router.push('/pengaturan/profil' as Href)}
          />
          <View style={styles.divider} />
          <NavRow
            icon="printer"
            title="Lebar Kertas Struk"
            subtitle="Pilih 58 mm atau 80 mm"
            onPress={() => router.push('/pengaturan/lebar-kertas' as Href)}
          />
        </View>

        {/* ── DISKON & PROMO ── */}
        <SectionHeader label="Diskon & Promo" />
        <View style={styles.group}>
          <NavRow
            icon="badge-percent"
            title="Preset Diskon"
            subtitle="Kelola preset diskon cepat kasir"
            onPress={() => router.push('/pengaturan/preset-diskon' as Href)}
          />
          {features.promoManagement && (
            <>
              <View style={styles.divider} />
              <NavRow
                icon="gift"
                title="Program Promo"
                subtitle="BOGO & diskon item otomatis"
                onPress={() => router.push('/pengaturan/promo' as Href)}
              />
            </>
          )}
        </View>

        {/* ── NOTIFIKASI — inventory only ── */}
        {features.inventory && (
          <>
            <SectionHeader label="Notifikasi" />
            <View style={styles.group}>
              <NavRow
                icon="warning"
                title="Notifikasi Stok"
                subtitle="Pengingat pagi, sore, dan mingguan"
                onPress={() => router.push('/pengaturan/notifikasi' as Href)}
              />
            </View>
          </>
        )}

        {/* ── DATA ── */}
        <SectionHeader label="Data" />
        <View style={styles.group}>
          <NavRow
            icon="download"
            title="Backup & Restore"
            subtitle="Export / import data Excel"
            onPress={() => router.push('/pengaturan/backup' as Href)}
          />
        </View>

        {/* ── KEAMANAN ── */}
        <SectionHeader label="Keamanan" />
        <View style={styles.group}>
          <NavRow
            icon="key"
            title="Kunci Aplikasi"
            subtitle="Biometrik / PIN saat buka aplikasi"
            onPress={() => router.push('/pengaturan/keamanan' as Href)}
          />
        </View>

        {/* ── TENTANG ── */}
        <SectionHeader label="Tentang" />
        <View style={styles.group}>
          <NavRow
            icon="store"
            title="Tentang Aplikasi"
            subtitle="Versi, kebijakan privasi, lisensi, bantuan"
            onPress={() => router.push('/pengaturan/tentang' as Href)}
          />
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  devWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...shadow(1),
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 38 + Spacing.md,
  },
});