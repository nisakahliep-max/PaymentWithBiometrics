import { memo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
}

/** Labelled text input with inline error/helper text, announced to screen readers. */
function TextFieldBase({ label, error, helper, style, ...inputProps }: TextFieldProps) {
  const message = error ?? helper;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.inkSubtle}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {message ? (
        <Text
          style={[styles.message, error ? styles.errorText : null]}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export const TextField = memo(TextFieldBase);

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.inkMuted },
  input: {
    ...typography.body,
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  message: { ...typography.caption, color: colors.inkMuted },
  errorText: { color: colors.danger },
});
