import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

/**
 * Last line of defence for render errors. Expo Router renders this instead of a
 * red screen / crash; the user can retry without restarting the app.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        This screen couldn’t be displayed. No money has moved as a result of this error.
      </Text>
      <Button title="Try again" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted },
});
