/**
 * pembayaran.tsx — setup Payment Gateway QRIS (Phase 1 + toggle prod Phase 4).
 *
 * Alur: pilih provider → input key → Test Connection → Simpan & Aktifkan.
 * Secret DISIMPAN KE SecureStore; tabel pg_credentials hanya metadata.
 * Layar TIDAK menampilkan key tersimpan (Phase S) — hanya status "Terhubung".
 *
 * DOKU butuh dua field: apiKey "ClientId:ClientSecret" + RSA private key PEM.
 */
import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing, shadow } from '../constants/colors';
import ScreenLayout from '../components/ui/screen-layout';
import Icon from '../components/ui/icon';
import type { PGProvider, PGMode } from '../lib/pg/types';
import { PROVIDER_LABEL, getAdapter } from '../lib/pg/registry';
import {
  simpanSecret, simpanRsaPrivateKey, hapusSecret, ambilSecret, ambilRsaPrivateKey,
} from '../lib/secure/secure-store';
import {
  getPgCredsAll, upsertPgMeta, aktifkanProvider, nonaktifkanProvider, setPgMode,
  hapusPgMeta, type PgCredMeta,
} from '../lib/db/pg-credentials';

const PROVIDERS: PGProvider[] = ['xendit', 'midtrans', 'doku'];

export default function PembayaranScreen() {
  const [metas, setMetas] = useState<PgCredMeta[]>([]);
  const [provider, setProvider] = useState<PGProvider>('xendit');
  const [mode, setMode] = useState<PGMode>('sandbox');
  const [secret, setSecret] = useState('');
  const [rsa, setRsa] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    const m = await getPgCredsAll();
    setMetas(m);
    const aktif = m.find((x) => x.is_active === 1);
    if (aktif) { setProvider(aktif.provider); setMode(aktif.mode); }
  }, []);

  useFocusEffect(useCallback(() => { void muat(); setSecret(''); setRsa(''); }, [muat]));

  /** Rakit creds runtime dari field form (untuk Test) atau dari store bila kosong. */
  const credsDariForm = async () => {
    const s = secret.trim() || (await ambilSecret(provider)) || '';
    const r = provider === 'doku' ? (rsa.trim() || (await ambilRsaPrivateKey(provider)) || '') : '';
    return { provider, mode, secret: s, rsaPrivateKey: r };
  };

  const handleTest = async () => {
    const creds = await credsDariForm();
    if (!creds.secret) { Alert.alert('Kredensial kosong', 'Isi key terlebih dahulu.'); return; }
    if (provider === 'doku' && !creds.rsaPrivateKey) {
      Alert.alert('RSA kosong', 'DOKU memerlukan RSA private key.'); return;
    }
    setTesting(true);
    try {
      const res = await getAdapter(provider).testConnection(creds);
      Alert.alert(res.ok ? 'Berhasil' : 'Gagal', res.pesan);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Tidak diketahui.');
    } finally {
      setTesting(false);
    }
  };

  const handleSimpan = async () => {
    const s = secret.trim();
    if (!s) { Alert.alert('Kredensial kosong', 'Isi key terlebih dahulu.'); return; }
    if (provider === 'doku' && !rsa.trim() && !(await ambilRsaPrivateKey('doku'))) {
      Alert.alert('RSA kosong', 'DOKU memerlukan RSA private key.'); return;
    }
    setSaving(true);
    try {
      await simpanSecret(provider, s);
      if (provider === 'doku' && rsa.trim()) await simpanRsaPrivateKey('doku', rsa.trim());
      await upsertPgMeta(provider, mode, true, PROVIDER_LABEL[provider]);
      await aktifkanProvider(provider);
      setSecret(''); setRsa('');
      await muat();
      Alert.alert('Tersimpan', `${PROVIDER_LABEL[provider]} aktif (${mode}).`);
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Tidak bisa menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleAktifkan = async (p: PGProvider) => {
    await aktifkanProvider(p);
    await muat();
  };

  const handleNonaktif = async (p: PGProvider) => {
    await nonaktifkanProvider(p);
    await muat();
  };

  const handleHapus = (p: PGProvider) => {
    Alert.alert('Hapus kredensial?', `Secret ${PROVIDER_LABEL[p]} dihapus dari perangkat.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: () => { void (async () => {
          await hapusSecret(p);
          await hapusPgMeta(p);
          await muat();
        })(); },
      },
    ]);
  };

  const handleToggleMode = async (p: PGProvider, m: PGMode) => {
    if (m === 'production') {
      Alert.alert(
        'Beralih ke PRODUCTION?',
        'Pastikan Anda memakai key live yang benar. Transaksi akan menagih uang sungguhan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Production', style: 'destructive', onPress: () => { void (async () => { await setPgMode(p, m); await muat(); })(); } },
        ]
      );
    } else {
      await setPgMode(p, m);
      await muat();
    }
  };

  return (
    <ScreenLayout title="Pembayaran QRIS" subtitle="Hubungkan penyedia pembayaran" bodyPadding={0}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Status tersimpan */}
          <Text style={styles.sectionLabel}>Penyedia Tersimpan</Text>
          {metas.length === 0 ? (
            <View style={styles.card}><Text style={styles.kosong}>Belum ada penyedia. Tambahkan di bawah.</Text></View>
          ) : (
            metas.map((m) => (
              <View key={m.provider} style={styles.metaRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.metaTitleRow}>
                    <Text style={styles.metaNama}>{PROVIDER_LABEL[m.provider]}</Text>
                    {m.is_active === 1 && (
                      <View style={styles.aktifBadge}><Text style={styles.aktifTeks}>AKTIF</Text></View>
                    )}
                  </View>
                  <Text style={styles.metaSub}>
                    {m.has_secret ? 'Terhubung' : 'Tanpa secret'} · {m.mode}
                  </Text>
                  <View style={styles.modeRow}>
                    {(['sandbox', 'production'] as PGMode[]).map((md) => (
                      <Pressable
                        key={md}
                        onPress={() => { void handleToggleMode(m.provider, md); }}
                        style={[styles.modeChip, m.mode === md && styles.modeChipAktif]}
                      >
                        <Text style={[styles.modeChipTeks, m.mode === md && styles.modeChipTeksAktif]}>{md}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.metaAksi}>
                  {m.is_active === 1 ? (
                    <Pressable onPress={() => { void handleNonaktif(m.provider); }} hitSlop={6}>
                      <Text style={styles.linkMuted}>Nonaktifkan</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => { void handleAktifkan(m.provider); }} hitSlop={6}>
                      <Text style={styles.linkAktif}>Aktifkan</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleHapus(m.provider)} hitSlop={6}>
                    <Text style={styles.linkHapus}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {/* Form tambah / perbarui */}
          <Text style={styles.sectionLabel}>Tambah / Perbarui</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Penyedia</Text>
            <View style={styles.provRow}>
              {PROVIDERS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setProvider(p)}
                  style={[styles.provChip, provider === p && styles.provChipAktif]}
                >
                  <Text style={[styles.provTeks, provider === p && styles.provTeksAktif]}>
                    {PROVIDER_LABEL[p]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Mode</Text>
            <View style={styles.provRow}>
              {(['sandbox', 'production'] as PGMode[]).map((md) => (
                <Pressable
                  key={md}
                  onPress={() => setMode(md)}
                  style={[styles.provChip, mode === md && styles.provChipAktif]}
                >
                  <Text style={[styles.provTeks, mode === md && styles.provTeksAktif]}>{md}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {provider === 'xendit' ? 'Secret Key'
                : provider === 'midtrans' ? 'Server Key'
                : 'apiKey  (ClientId:ClientSecret)'}
            </Text>
            <TextInput
              style={styles.input}
              value={secret}
              onChangeText={setSecret}
              placeholder={provider === 'doku' ? 'BRN-xxxx:SK-xxxx' : 'Tempel key di sini'}
              placeholderTextColor={Colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            {provider === 'doku' && (
              <>
                <Text style={styles.fieldLabel}>RSA Private Key (PEM)</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={rsa}
                  onChangeText={setRsa}
                  placeholder={'-----BEGIN PRIVATE KEY-----\n...'}
                  placeholderTextColor={Colors.textSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                <Text style={styles.hint}>
                  Gunakan RSA-2048 (PEM ~1.7KB). RSA-4096 bisa melewati batas Keystore Android.
                </Text>
              </>
            )}

            <View style={styles.formAksi}>
              <Pressable style={styles.btnTest} onPress={() => { void handleTest(); }} disabled={testing}>
                {testing ? <ActivityIndicator color={Colors.primary} /> : (
                  <>
                    <Icon name="check" size={16} color={Colors.primary} />
                    <Text style={styles.btnTestTeks}>Test Connection</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.btnSimpan} onPress={() => { void handleSimpan(); }} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.onPrimary} /> : (
                  <Text style={styles.btnSimpanTeks}>Simpan & Aktifkan</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.amanBox}>
            <Icon name="key" size={16} color={Colors.accent} />
            <Text style={styles.amanTeks}>
              Key disimpan di penyimpanan aman perangkat (Keychain/Keystore), tidak ikut ter-backup,
              dan tidak pernah dikirim ke server kami.
            </Text>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  sectionLabel: {
    fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...shadow(1) },
  kosong: { color: Colors.textMuted, fontSize: FontSize.sm },

  metaRow: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm, ...shadow(1),
  },
  metaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaNama: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  aktifBadge: { backgroundColor: Colors.successSoft, borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  aktifTeks: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '800' },
  metaSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modeChip: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radii.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  modeChipAktif: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  modeChipTeks: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },
  modeChipTeksAktif: { color: Colors.primaryDark },
  metaAksi: { alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm },
  linkAktif: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.sm },
  linkMuted: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSize.sm },
  linkHapus: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },

  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 18 },

  provRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  provChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  provChipAktif: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  provTeks: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '700' },
  provTeksAktif: { color: Colors.onPrimary },

  formAksi: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  btnTest: {
    flex: 1, height: 52, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md,
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnTestTeks: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },
  btnSimpan: { flex: 1, height: 52, backgroundColor: Colors.primary, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  btnSimpanTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.md },

  amanBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.surfaceAlt, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.lg,
  },
  amanTeks: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
});
