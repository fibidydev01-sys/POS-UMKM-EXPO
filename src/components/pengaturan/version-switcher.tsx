/**
 * version-switcher.tsx — panel DEV-ONLY (staging only).
 *
 * Setelah drop V2: tidak ada V1/V2 toggle.
 * Hanya menampilkan toggle locked/unlocked untuk preview UI
 * dan status flag staging.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import {
  features,
  setDevUnlocked,
  getDevUnlocked,
  subscribeFlags,
} from '../../lib/config/features';
import {
  showVersionSwitcher, paymentEnabled, aktivasiEnabled,
} from '../../lib/config/staging-flags';

export default function VersionSwitcher() {
  if (!showVersionSwitcher()) return null;
  return <VersionSwitcherInner />;
}

function VersionSwitcherInner() {
  const [, force] = useState(0);
  useEffect(() => subscribeFlags(() => force((n) => n + 1)), []);

  const override   = getDevUnlocked();
  const isLocked   = features.locked;

  const toggleOverride = () => {
    if (override === null) {
      setDevUnlocked(!isLocked);
    } else {
      setDevUnlocked(null);
    }
  };

  const resetOverride = () => setDevUnlocked(null);

  const pay = paymentEnabled();
  const akt = aktivasiEnabled();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headKiri}>
          <View style={styles.devDot} />
          <Text style={styles.judul}>Mode Pengembang (Staging)</Text>
        </View>
        <View style={styles.badgeEnv}>
          <Text style={styles.badgeEnvTeks}>STAGING</Text>
        </View>
      </View>

      <Text style={styles.sub}>
        Toggle locked/unlocked untuk preview UI. Hanya tampil di staging —
        otomatis hilang di production.
      </Text>

      <Text style={styles.label}>Status Lisensi</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, isLocked ? styles.pillLocked : styles.pillUnlocked]}>
          <Text style={[styles.pillTeks, isLocked ? styles.pillTeksLocked : styles.pillTeksUnlocked]}>
            {isLocked ? 'LOCKED' : 'UNLOCKED'}
          </Text>
        </View>
        <Pressable onPress={toggleOverride} style={styles.toggleBtn}>
          <Text style={styles.toggleTeks}>
            {override !== null ? 'Override aktif — ' : ''}
            {isLocked ? 'Buka kunci (dev)' : 'Kunci (dev)'}
          </Text>
        </Pressable>
        {override !== null && (
          <Pressable onPress={resetOverride} hitSlop={8} style={styles.resetBtn}>
            <Icon name="undo" size={14} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.resetTeks}>Reset</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.divider} />
      <Text style={styles.label}>Flag Staging</Text>
      <FlagRow
        nama="PAYMENT_ENABLED"
        aktif={pay}
        ketAktif="Billing (IAP) wajib"
        ketMati="Billing dilewati"
      />
      <FlagRow
        nama="AKTIVASI_ENABLED"
        aktif={akt}
        ketAktif="Aktivasi wajib"
        ketMati="Aktivasi dilewati"
      />

      <View style={styles.note}>
        <Icon name="warning" size={14} color={Colors.warning} strokeWidth={2.4} />
        <Text style={styles.noteTeks}>
          Override ini TIDAK berlaku di production.
          Di production billing & aktivasi selalu aktif.
        </Text>
      </View>
    </View>
  );
}

function FlagRow({
  nama, aktif, ketAktif, ketMati,
}: { nama: string; aktif: boolean; ketAktif: string; ketMati: string }) {
  return (
    <View style={styles.flagRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.flagNama}>{nama}</Text>
        <Text style={styles.flagKet}>{aktif ? ketAktif : ketMati}</Text>
      </View>
      <View style={[styles.pill, aktif ? styles.pillOn : styles.pillOff]}>
        <Text style={[styles.pillTeksFlag, aktif ? styles.pillTeksOn : styles.pillTeksOff]}>
          {aktif ? 'TRUE' : 'FALSE'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    borderWidth: 1.5, borderColor: Colors.warning,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headKiri: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  devDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.warning },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  badgeEnv: {
    backgroundColor: Colors.warningSoft, borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  badgeEnvTeks: { fontSize: 10, fontWeight: '800', color: Colors.warning, letterSpacing: 0.5 },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },
  label: {
    fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap',
  },
  statusPill: {
    borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  pillLocked:   { backgroundColor: Colors.dangerSoft },
  pillUnlocked: { backgroundColor: Colors.successSoft },
  pillTeks:     { fontSize: FontSize.xs, fontWeight: '800' },
  pillTeksLocked:   { color: Colors.danger },
  pillTeksUnlocked: { color: Colors.success },
  toggleBtn: {
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  toggleTeks: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  resetTeks: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginTop: Spacing.lg },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  flagNama: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  flagKet:  { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  pill: {
    borderRadius: Radii.sm, paddingHorizontal: Spacing.md,
    paddingVertical: 4, minWidth: 64, alignItems: 'center',
  },
  pillOn:  { backgroundColor: Colors.successSoft },
  pillOff: { backgroundColor: Colors.surfaceAlt },
  pillTeksFlag: { fontSize: FontSize.xs, fontWeight: '800' },
  pillTeksOn:   { color: Colors.success },
  pillTeksOff:  { color: Colors.textMuted },
  note: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.warningSoft, borderRadius: Radii.md,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  noteTeks: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600', lineHeight: 17 },
});
