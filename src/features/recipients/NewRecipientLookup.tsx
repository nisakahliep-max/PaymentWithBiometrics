import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar, Button } from '@/components/ui';
import { api, isApiError, toUserFacingError } from '@/services/api';
import { colors, radius, spacing, typography } from '@/theme/tokens';

import { formatIdentifier } from './identifiers';
import type { Recipient, RecipientChannel } from './types';

type LookupState =
  | { status: 'loading' }
  | { status: 'found'; recipient: Recipient }
  | { status: 'error'; title: string; message: string };

const LOOKUP_DEBOUNCE_MS = 400;

/**
 * DuitNow-style "name enquiry": before paying a new number we ask the bank who
 * owns it and show the *registered* name, so the user can catch typos before
 * money moves. Rendered with `key={value}` so a new number starts fresh.
 *
 * Async hygiene: debounced, and the in-flight request is aborted when the number
 * changes or the screen closes, so a slow old response can never overwrite a newer one.
 */
export function NewRecipientLookup({
  channel,
  value,
  onSelect,
}: {
  channel: RecipientChannel;
  value: string;
  onSelect: (recipient: Recipient) => void;
}) {
  const [state, setState] = useState<LookupState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.lookupRecipient(channel, value, controller.signal).then(
        (recipient) => setState({ status: 'found', recipient }),
        (error: unknown) => {
          if (isApiError(error) && error.code === 'ABORTED') return;
          const { title, message } = toUserFacingError(error);
          setState({ status: 'error', title, message });
        },
      );
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [channel, value, attempt]);

  const label = channel === 'mobile' ? 'DuitNow mobile' : 'Account number';

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.card} accessibilityLiveRegion="polite">
      <Text style={styles.caption}>
        New recipient · {label} {formatIdentifier(channel, value)}
      </Text>

      {state.status === 'loading' ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.body}>Checking who this belongs to…</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorTitle}>{state.title}</Text>
          <Text style={styles.body}>{state.message}</Text>
          <Button
            title="Check again"
            variant="secondary"
            onPress={() => {
              setState({ status: 'loading' });
              setAttempt((a) => a + 1);
            }}
          />
        </View>
      ) : (
        <View style={styles.found}>
          <View style={styles.row}>
            <Avatar name={state.recipient.name} />
            <View style={styles.flex}>
              <Text style={styles.name}>{state.recipient.name}</Text>
              <Text style={styles.caption}>Registered name · {state.recipient.bankName}</Text>
            </View>
          </View>
          <Button
            testID="lookup-select"
            title={`Pay ${state.recipient.name.split(' ')[0] ?? ''}`}
            onPress={() => onSelect(state.recipient)}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  found: { gap: spacing.md },
  caption: { ...typography.caption, color: colors.inkMuted },
  body: { ...typography.body, color: colors.ink, flexShrink: 1 },
  name: { ...typography.heading, color: colors.ink },
  errorBlock: { gap: spacing.sm },
  errorTitle: { ...typography.label, color: colors.danger },
});
