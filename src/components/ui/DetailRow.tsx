import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

/** Label/value pair used on the review and receipt screens. */
function DetailRowBase({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasis && styles.emphasis]} selectable>
        {value}
      </Text>
    </View>
  );
}

export const DetailRow = memo(DetailRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.sm },
  label: { ...typography.body, color: colors.inkMuted },
  value: { ...typography.body, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  emphasis: { fontWeight: '700' },
});
