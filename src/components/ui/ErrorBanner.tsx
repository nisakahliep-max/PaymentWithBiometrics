import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface ErrorBannerProps {
  title: string;
  message: string;
  tone?: 'error' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Inline, non-blocking error. Shakes once when the message changes so a repeated
 * failure is still noticeable, and is announced as an alert to screen readers.
 */
export function ErrorBanner({ title, message, tone = 'error', actionLabel, onAction }: ErrorBannerProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(
      withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [message, offset]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const palette = tone === 'error' ? errorPalette : warningPalette;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.fg }, shake]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Ionicons name="alert-circle" size={20} color={palette.fg} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.action}>
            <Text style={[styles.actionText, { color: palette.fg }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const errorPalette = { bg: colors.dangerSoft, fg: colors.danger };
const warningPalette = { bg: colors.warningSoft, fg: colors.warning };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  body: { flex: 1, gap: spacing.xs },
  title: { ...typography.label },
  message: { ...typography.body, color: colors.ink },
  action: { marginTop: spacing.xs, alignSelf: 'flex-start' },
  actionText: { ...typography.label, textDecorationLine: 'underline' },
});
