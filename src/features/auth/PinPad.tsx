import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

interface PinPadProps {
  length: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * Custom keypad instead of the system keyboard: no third-party keyboard can log
 * the digits, no autofill/suggestions, and the layout is identical on both OSes.
 */
export function PinPad({ length, value, onChange, disabled }: PinPadProps) {
  const press = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === 'del') onChange(value.slice(0, -1));
      else if (value.length < length) onChange(value + key);
    },
    [disabled, length, onChange, value],
  );

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`${value.length} of ${length} digits entered`}
      >
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, index) => (
          <Key key={index} value={key} onPress={press} disabled={disabled} />
        ))}
      </View>
    </View>
  );
}

const Key = memo(function Key({
  value,
  onPress,
  disabled,
}: {
  value: string;
  onPress: (key: string) => void;
  disabled?: boolean;
}) {
  if (value === '') return <View style={styles.key} />;
  const isDelete = value === 'del';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDelete ? 'Delete' : value}
      disabled={disabled}
      onPress={() => onPress(value)}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      {isDelete ? (
        <Ionicons name="backspace-outline" size={26} color={colors.ink} />
      ) : (
        <Text style={styles.keyText}>{value}</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.inkSubtle,
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 84, justifyContent: 'center' },
  key: { width: 84, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  keyPressed: { backgroundColor: colors.primarySoft },
  keyText: { fontSize: 28, fontWeight: '500', color: colors.ink },
});
