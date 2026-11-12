import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

const PALETTE = ['#0E7C66', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#4D7C0F'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Deterministic colour per name so the same person always looks the same. */
function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? colors.primary;
}

function AvatarBase({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      accessible={false}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.surface, fontWeight: '700' },
});
