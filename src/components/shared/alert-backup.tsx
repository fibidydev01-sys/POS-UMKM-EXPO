/**
 * AlertBackup — banner pengingat backup data di dashboard.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';

interface Props {
  onBackup: () => void;
  onTutup: () => void;
}

export default function AlertBackup({ onBackup, onTutup }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.kiri}>
        <Text style={styles.judul}>💾 Sudah backup data?</Text>
        <Text style={styles.teks}>
          Amankan transaksi Anda ke Excel. Tersimpan di HP, bisa hilang jika aplikasi dihapus.
        </Text>
        <View style={styles.aksiRow}>
          <Pressable onPress={onBackup} style={styles.btn}>
            <Text style={styles.btnTeks}>Backup Sekarang</Text>
          </Pressable>
          <Pressable onPress={onTutup} hitSlop={8} style={styles.tutup}>
            <Text style={styles.tutupTeks}>Nanti</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.warningSoft, borderRadius: Radii.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: '#F0D9A8',
  },
  kiri: { gap: Spacing.xs },
  judul: { fontSize: FontSize.md, fontWeight: '800', color: Colors.warning },
  teks: { fontSize: FontSize.sm, color: '#8A6D1F', lineHeight: 19 },
  aksiRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  btn: { backgroundColor: Colors.warning, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  btnTeks: { color: Colors.onPrimary, fontWeight: '800', fontSize: FontSize.sm },
  tutup: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  tutupTeks: { color: '#8A6D1F', fontWeight: '700', fontSize: FontSize.sm },
});
