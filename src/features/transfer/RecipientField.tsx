import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { maskIdentifier } from '@/features/recipients/identifiers';
import type { Recipient } from '@/features/recipients/types';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme/tokens';

interface RecipientFieldProps {
  recipient: Recipient | null;
  onPress: () => void;
  error?: string;
}

/** Tappable "select" field — opens the recipient picker. */
function RecipientFieldBase({ recipient, onPress, error }: RecipientFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>To</Text>
      <Pressable
        testID="recipient-field"
        accessibilityRole="button"
        accessibilityLabel={recipient ? `Recipient ${recipient.name}. Tap to change.` : 'Choose recipient'}
        accessibilityHint={error}
        onPress={onPress}
        style={({ pressed }) => [styles.field, error ? styles.fieldError : null, pressed && styles.pressed]}
      >
        {recipient ? (
          <>
            <Avatar name={recipient.name} size={36} />
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {recipient.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {recipient.bankName} · {maskIdentifier(recipient.accountNumber)}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.placeholderIcon}>
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.text, styles.placeholder]}>Name, mobile or account number</Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.inkSubtle} />
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const RecipientField = memo(RecipientFieldBase);

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.inkMuted },
  field: {
    minHeight: TOUCH_TARGET + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.danger },
  pressed: { opacity: 0.7 },
  text: { flex: 1 },
  name: { ...typography.heading, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted },
  placeholder: { ...typography.body, color: colors.inkSubtle },
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...typography.caption, color: colors.danger },
});
