import { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';
import { centsFromDigits, CURRENCY_SYMBOL, formatAmount, formatMoney } from '@/utils/money';

const QUICK_AMOUNTS = [2000, 5000, 10000, 20000] as const;

interface AmountInputProps {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  onBlur?: () => void;
  error?: string;
  availableCents: number | null;
}

/**
 * Large "cash register" amount field: digits shift in from the right, so the
 * user never types a decimal point and can't produce an invalid number.
 * Quick-pick chips cover the most common amounts in one tap.
 */
function AmountInputBase({ valueCents, onChangeCents, onBlur, error, availableCents }: AmountInputProps) {
  const remaining = availableCents !== null && valueCents > 0 ? availableCents - valueCents : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <Text style={styles.currency}>{CURRENCY_SYMBOL}</Text>
        <TextInput
          testID="amount-input"
          accessibilityLabel="Amount in Ringgit"
          accessibilityHint={error}
          value={valueCents === 0 ? '' : formatAmount(valueCents)}
          onChangeText={(text) => onChangeCents(centsFromDigits(text))}
          onBlur={onBlur}
          placeholder="0.00"
          placeholderTextColor={colors.inkSubtle}
          keyboardType="number-pad"
          inputMode="numeric"
          selectTextOnFocus={false}
          contextMenuHidden
          style={styles.input}
        />
      </View>

      <View style={styles.chips}>
        {QUICK_AMOUNTS.map((cents) => (
          <Pressable
            key={cents}
            accessibilityRole="button"
            accessibilityLabel={`Set amount to ${formatMoney(cents)}`}
            onPress={() => onChangeCents(cents)}
            style={({ pressed }) => [styles.chip, valueCents === cents && styles.chipActive, pressed && styles.chipPressed]}
          >
            <Text style={[styles.chipText, valueCents === cents && styles.chipTextActive]}>
              {formatMoney(cents).replace('.00', '')}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : remaining !== null && remaining >= 0 ? (
        <Text style={styles.helper}>Balance after transfer: {formatMoney(remaining)}</Text>
      ) : null}
    </View>
  );
}

export const AmountInput = memo(AmountInputBase);

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { ...typography.label, color: colors.inkMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  inputRowError: { borderColor: colors.danger },
  currency: { ...typography.title, color: colors.inkMuted },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    paddingVertical: spacing.md,
    fontVariant: ['tabular-nums'],
  },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipPressed: { opacity: 0.7 },
  chipText: { ...typography.label, color: colors.ink },
  chipTextActive: { color: colors.primary },
  error: { ...typography.caption, color: colors.danger },
  helper: { ...typography.caption, color: colors.inkMuted },
});
