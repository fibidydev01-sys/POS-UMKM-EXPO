/**
 * InputOTP — input kode tersegmentasi (untuk kode aktivasi).
 * Menampilkan `length` kotak; mengetik mengisi berurutan. Satu TextInput
 * tersembunyi menangkap input agar keyboard & paste tetap mulus.
 */
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../../constants/colors';

interface Props {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
}

export default function InputOTP({ length = 6, value, onChange, autoFocus }: Props) {
  const ref = useRef<TextInput>(null);
  const [fokus, setFokus] = useState(false);

  const sanit = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length);

  const kotak = Array.from({ length }, (_, i) => value[i] ?? '');
  const aktifIdx = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.wrap}>
      {kotak.map((c, i) => {
        const isAktif = fokus && i === aktifIdx;
        return (
          <View key={i} style={[styles.kotak, isAktif && styles.kotakAktif, !!c && styles.kotakIsi]}>
            <Text style={styles.char}>{c}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(sanit(t))}
        onFocus={() => setFokus(true)}
        onBlur={() => setFokus(false)}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        maxLength={length}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  kotak: {
    width: 44, height: 54, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  kotakAktif: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  kotakIsi: { borderColor: Colors.borderStrong },
  char: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
