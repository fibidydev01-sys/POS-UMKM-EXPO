/**
 * NotifSettingsSection — bagian "Notifikasi Stok" untuk layar Pengaturan.
 *
 * DIBUAT MANDIRI agar gampang disisipkan ke app/(tabs)/pengaturan.tsx yang sudah
 * ada TANPA mengubah bagian lain (profil, kertas, QRIS, preset diskon, promo,
 * backup, keamanan). Cukup import lalu render satu baris:
 *
 *     import NotifSettingsSection from '../../components/pengaturan/notif-settings';
 *     // ...di dalam ScrollView Pengaturan:
 *     <NotifSettingsSection />
 *
 * Isi:
 *   - Master switch (aktif/nonaktif semua notifikasi stok).
 *   - Toggle + input jam untuk reminder Pagi, Sore.
 *   - Toggle + pemilih hari + input jam untuk reminder Mingguan.
 *   - Tombol "Kembalikan ke default".
 *
 * Setiap perubahan langsung:
 *   1. disimpan ke SQLite (updateNotifSettings / resetNotifSettings),
 *   2. memicu rescheduleStockReminders() agar jadwal OS ikut ter-update.
 *
 * Input jam memakai TextInput "HH:MM" sederhana (tanpa dependency date-picker
 * tambahan) — divalidasi & dinormalkan saat blur. Konsisten dgn gaya input lain.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import Icon from '../ui/icon';
import { useToast } from '../ui/toast';
import {
  getNotifSettings,
  updateNotifSettings,
  resetNotifSettings,
  rescheduleStockReminders,
  cekIzinNotifikasi,
  mintaIzinNotifikasi,
  formatJam,
  DEFAULT_NOTIF_SETTINGS,
} from '../../lib/notification';
import type { NotifSettings, JamMenit } from '../../lib/notification';

const HARI = [
  { v: 1, label: 'Min' },
  { v: 2, label: 'Sen' },
  { v: 3, label: 'Sel' },
  { v: 4, label: 'Rab' },
  { v: 5, label: 'Kam' },
  { v: 6, label: 'Jum' },
  { v: 7, label: 'Sab' },
];

function jamKeText(jm: JamMenit): string {
  return formatJam(jm);
}

function textKeJam(teks: string, fallback: JamMenit): JamMenit {
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(teks.trim());
  if (!m) return fallback;
  const hour = Math.min(23, Math.max(0, parseInt(m[1] || '0', 10)));
  const minute = Math.min(59, Math.max(0, parseInt(m[2] || '0', 10)));
  return { hour, minute };
}

export default function NotifSettingsSection() {
  const toast = useToast();
  const [s, setS] = useState<NotifSettings | null>(null);
  const [izinDitolak, setIzinDitolak] = useState(false);

  // Buffer teks untuk tiap input jam (agar bisa diketik bebas sebelum dinormalkan).
  const [pagiText, setPagiText] = useState('08:00');
  const [soreText, setSoreText] = useState('16:00');
  const [weeklyText, setWeeklyText] = useState('09:00');

  useEffect(() => {
    void (async () => {
      const cfg = await getNotifSettings();
      setS(cfg);
      setPagiText(jamKeText(cfg.pagi));
      setSoreText(jamKeText(cfg.sore));
      setWeeklyText(jamKeText(cfg.weekly));
      const izin = await cekIzinNotifikasi();
      setIzinDitolak(!izin.granted);
    })();
  }, []);

  // Simpan patch + reschedule. Pusatkan agar konsisten.
  const terapkan = useCallback(async (patch: Partial<NotifSettings>) => {
    await updateNotifSettings(patch);
    await rescheduleStockReminders();
  }, []);

  if (!s) {
    return (
      <View style={styles.card}>
        <Text style={styles.judul}>Notifikasi Stok</Text>
        <Text style={styles.memuat}>Memuat pengaturan…</Text>
      </View>
    );
  }

  const setMaster = (val: boolean) => {
    const next = { ...s, enabled: val };
    setS(next);
    void (async () => {
      // Bila dinyalakan tapi izin belum ada, minta izin dulu.
      if (val) {
        const izin = await mintaIzinNotifikasi();
        setIzinDitolak(!izin.granted);
      }
      await terapkan({ enabled: val });
      toast.info(val ? 'Notifikasi stok diaktifkan' : 'Notifikasi stok dimatikan');
    })();
  };

  const setToggle = (key: 'pagiEnabled' | 'soreEnabled' | 'weeklyEnabled', val: boolean) => {
    const next = { ...s, [key]: val } as NotifSettings;
    setS(next);
    void terapkan({ [key]: val } as Partial<NotifSettings>);
  };

  const commitJam = (
    which: 'pagi' | 'sore' | 'weekly',
    teks: string
  ) => {
    const fallback = s[which];
    const jm = textKeJam(teks, fallback);
    const next = { ...s, [which]: jm } as NotifSettings;
    setS(next);
    if (which === 'pagi') setPagiText(jamKeText(jm));
    if (which === 'sore') setSoreText(jamKeText(jm));
    if (which === 'weekly') setWeeklyText(jamKeText(jm));
    void terapkan({ [which]: jm } as Partial<NotifSettings>);
  };

  const setHari = (weekday: number) => {
    const next = { ...s, weeklyWeekday: weekday };
    setS(next);
    void terapkan({ weeklyWeekday: weekday });
  };

  const reset = () => {
    void (async () => {
      await resetNotifSettings();
      await rescheduleStockReminders();
      const cfg = await getNotifSettings();
      setS(cfg);
      setPagiText(jamKeText(cfg.pagi));
      setSoreText(jamKeText(cfg.sore));
      setWeeklyText(jamKeText(cfg.weekly));
      toast.success('Pengaturan notifikasi dikembalikan ke default');
    })();
  };

  const mati = !s.enabled;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.judulRow}>
          <View style={styles.judulDot} />
          <Text style={styles.judul}>Notifikasi Stok</Text>
        </View>
        <Switch value={s.enabled} onValueChange={setMaster} />
      </View>
      <Text style={styles.sub}>
        Pengingat otomatis untuk cek & restock stok. Default pagi 08:00, sore 16:00,
        dan mingguan tiap Senin 09:00 — bisa diubah sesuai jam buka toko.
      </Text>

      {izinDitolak && s.enabled && (
        <View style={styles.warnBox}>
          <Icon name="warning" size={16} color={Colors.warning} strokeWidth={2.4} />
          <Text style={styles.warnTeks}>
            Izin notifikasi belum aktif. Aktifkan lewat Pengaturan HP agar pengingat muncul.
          </Text>
        </View>
      )}

      {/* Reminder harian */}
      <View style={[styles.block, mati && styles.blockMati]} pointerEvents={mati ? 'none' : 'auto'}>
        <BarisJam
          label="Pengingat Pagi"
          hint="Cek stok sebelum mulai jualan"
          enabled={s.pagiEnabled}
          onToggle={(v) => setToggle('pagiEnabled', v)}
          jamText={pagiText}
          onChangeJam={setPagiText}
          onCommitJam={() => commitJam('pagi', pagiText)}
        />
        <BarisJam
          label="Pengingat Sore"
          hint="Cek sisa stok sebelum tutup"
          enabled={s.soreEnabled}
          onToggle={(v) => setToggle('soreEnabled', v)}
          jamText={soreText}
          onChangeJam={setSoreText}
          onCommitJam={() => commitJam('sore', soreText)}
          noBorder
        />
      </View>

      {/* Reminder mingguan */}
      <View style={[styles.block, mati && styles.blockMati]} pointerEvents={mati ? 'none' : 'auto'}>
        <BarisJam
          label="Restock Mingguan"
          hint="Pengingat belanja stok rutin"
          enabled={s.weeklyEnabled}
          onToggle={(v) => setToggle('weeklyEnabled', v)}
          jamText={weeklyText}
          onChangeJam={setWeeklyText}
          onCommitJam={() => commitJam('weekly', weeklyText)}
          noBorder
        />
        {s.weeklyEnabled && (
          <View style={styles.hariWrap}>
            {HARI.map((h) => {
              const aktif = s.weeklyWeekday === h.v;
              return (
                <Pressable
                  key={h.v}
                  onPress={() => setHari(h.v)}
                  style={[styles.hariChip, aktif && styles.hariChipAktif]}
                >
                  <Text style={[styles.hariTeks, aktif && styles.hariTeksAktif]}>{h.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Pressable onPress={reset} style={styles.resetBtn} hitSlop={6}>
        <Icon name="undo" size={15} color={Colors.textMuted} strokeWidth={2.2} />
        <Text style={styles.resetTeks}>
          Kembalikan ke default ({formatJam(DEFAULT_NOTIF_SETTINGS.pagi)} / {formatJam(DEFAULT_NOTIF_SETTINGS.sore)} / Senin {formatJam(DEFAULT_NOTIF_SETTINGS.weekly)})
        </Text>
      </Pressable>
    </View>
  );
}

// ── Sub-komponen baris reminder (toggle + input jam) ──
interface BarisJamProps {
  label: string;
  hint: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  jamText: string;
  onChangeJam: (t: string) => void;
  onCommitJam: () => void;
  noBorder?: boolean;
}

function BarisJam({
  label, hint, enabled, onToggle, jamText, onChangeJam, onCommitJam, noBorder,
}: BarisJamProps) {
  return (
    <View style={[styles.baris, !noBorder && styles.barisBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.barisLabel}>{label}</Text>
        <Text style={styles.barisHint}>{hint}</Text>
      </View>
      <TextInput
        value={jamText}
        onChangeText={onChangeJam}
        onBlur={onCommitJam}
        onSubmitEditing={onCommitJam}
        editable={enabled}
        keyboardType="numbers-and-punctuation"
        placeholder="08:00"
        placeholderTextColor={Colors.textSubtle}
        maxLength={5}
        style={[styles.jamInput, !enabled && styles.jamInputMati]}
      />
      <Switch value={enabled} onValueChange={onToggle} />
    </View>
  );
}

// ── Switch kecil reusable (RN, tanpa dependency) ──
function Switch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={6}>
      <View style={[swStyles.track, value && swStyles.trackOn]}>
        <View style={[swStyles.knob, value && swStyles.knobOn]} />
      </View>
    </Pressable>
  );
}

const swStyles = StyleSheet.create({
  track: {
    width: 46, height: 27, borderRadius: 14,
    backgroundColor: Colors.borderStrong, padding: 3, justifyContent: 'center',
  },
  trackOn: { backgroundColor: Colors.primary },
  knob: {
    width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff',
    ...(Platform.OS === 'android' ? { elevation: 2 } : {
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    }),
  },
  knobOn: { alignSelf: 'flex-end' },
});

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  judulRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  judulDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  judul: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },
  memuat: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.md },

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.warningSoft, borderRadius: Radii.md, padding: Spacing.md,
    marginTop: Spacing.md,
  },
  warnTeks: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600', lineHeight: 17 },

  block: {
    marginTop: Spacing.md, backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.md, paddingHorizontal: Spacing.md,
  },
  blockMati: { opacity: 0.45 },

  baris: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  barisBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  barisLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  barisHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  jamInput: {
    width: 64, textAlign: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.sm, fontSize: FontSize.md, fontWeight: '800', color: Colors.text,
  },
  jamInputMati: { color: Colors.textSubtle, backgroundColor: Colors.surfaceAlt },

  hariWrap: { flexDirection: 'row', gap: 6, paddingBottom: Spacing.md, flexWrap: 'wrap' },
  hariChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minWidth: 44, alignItems: 'center',
  },
  hariChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  hariTeks: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  hariTeksAktif: { color: Colors.onPrimary },

  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  resetTeks: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
});
