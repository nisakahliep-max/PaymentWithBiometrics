import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import type { Transaction } from '@/features/transfer/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatShortDateTime } from '@/utils/date';
import { formatMoney } from '@/utils/money';

function TransactionRowBase({ transaction, onPress }: { transaction: Transaction; onPress: (t: Transaction) => void }) {
  const { recipient, amountCents, status, note, createdAt } = transaction;
  const failed = status === 'failed';
  const subtitle = [formatShortDateTime(createdAt), note].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${failed ? 'Failed transfer' : 'Transfer'} of ${formatMoney(amountCents)} to ${recipient.name}, ${subtitle}`}
      accessibilityHint="Double tap to send again"
      onPress={() => onPress(transaction)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={recipient.name} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {recipient.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, failed && styles.amountFailed]}>{formatMoney(-amountCents)}</Text>
        {failed ? <Text style={styles.badge}>Failed</Text> : null}
      </View>
    </Pressable>
  );
}

export const TransactionRow = memo(TransactionRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.primarySoft },
  text: { flex: 1, gap: 2 },
  name: { ...typography.heading, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { ...typography.heading, color: colors.ink, fontVariant: ['tabular-nums'] },
  amountFailed: { color: colors.inkSubtle, textDecorationLine: 'line-through' },
  badge: {
    ...typography.caption,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
