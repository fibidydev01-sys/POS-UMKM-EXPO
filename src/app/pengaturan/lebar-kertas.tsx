/**
 * pengaturan/lebar-kertas.tsx — Halaman Lebar Kertas Struk.
 *
 * State lokal. Baca dari config, simpan via updateProfil.
 */
import { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';
import { getConfig, updateProfil } from '../../lib/db/pengaturan';
import LebarKertas from '../../components/pengaturan/lebar-kertas';

export default function LebarKertasScreen() {
  const [lebar, setLebar] = useState<58 | 80>(58);

  const muat = useCallback(async () => {
    const c = await getConfig();
    setLebar((c.paper_width === 80 ? 80 : 58) as 58 | 80);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat])
  );

  const gantiLebar = useCallback(async (val: 58 | 80) => {
    setLebar(val);
    await updateProfil({ paper_width: val });
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Lebar Kertas Struk' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hint}>
          <Text style={styles.hintTeks}>
            Pilih lebar kertas yang sesuai dengan printer thermal Anda.
            Perubahan langsung tersimpan.
          </Text>
        </View>

        <LebarKertas
          value={lebar}
          onChange={(v) => { void gantiLebar(v); }}
        />

        <View style={styles.keterangan}>
          <View style={styles.ketRow}>
            <Text style={styles.ketLabel}>58 mm</Text>
            <Text style={styles.ketNilai}>
              Struk kecil — umum untuk printer portabel / desktop ringkas
            </Text>
          </View>
          <View style={styles.ketRow}>
            <Text style={styles.ketLabel}>80 mm</Text>
            <Text style={styles.ketNilai}>
              Struk lebar — lebih mudah dibaca, cocok printer konter kasir
            </Text>
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
  },
  hint: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  hintTeks: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    lineHeight: 19,
  },
  keterangan: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  ketRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ketLabel: {
    width: 56,
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },
  ketNilai: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
