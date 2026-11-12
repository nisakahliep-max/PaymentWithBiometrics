import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { maskIdentifier } from './identifiers';
import type { Recipient } from './types';

export const RECIPIENT_ROW_HEIGHT = 68;

interface RecipientRowProps {
  recipient: Recipient;
  onPress: (recipient: Recipient) => void;
}

/**
 * List row. `memo` + a stable `onPress` from the parent means FlashList can
 * recycle rows without re-rendering ones whose data didn't change.
 */
function RecipientRowBase({ recipient, onPress }: RecipientRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipient.name}, ${recipient.bankName}, account ending ${recipient.accountNumber.slice(-4)}`}
      onPress={() => onPress(recipient)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={recipient.name} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {recipient.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {recipient.bankName} · {maskIdentifier(recipient.accountNumber)}
        </Text>
      </View>
    </Pressable>
  );
}

export const RecipientRow = memo(RecipientRowBase);

const styles = StyleSheet.create({
  row: {
    height: RECIPIENT_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.primarySoft },
  text: { flex: 1, gap: 2 },
  name: { ...typography.heading, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted },
});
