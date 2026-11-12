import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { maskIdentifier } from '@/features/recipients/identifiers';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

import { useAccountStore } from './accountStore';

/**
 * Shows the live balance. Subscribes with `useShallow` to exactly the fields it
 * renders. Includes a privacy toggle (common in MY banking apps) for use in public.
 */
function BalanceCardBase() {
  const { balanceCents, status, error, accountNumber, refresh } = useAccountStore(
    useShallow((s) => ({
      balanceCents: s.balanceCents,
      status: s.status,
      error: s.error,
      accountNumber: s.accountNumber,
      refresh: s.refresh,
    })),
  );
  const [hidden, setHidden] = useState(false);
  const isFirstLoad = balanceCents === null && status !== 'error';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Available balance{accountNumber ? ` · ${maskIdentifier(accountNumber)}` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
          onPress={() => setHidden((h) => !h)}
          hitSlop={12}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.surface} />
        </Pressable>
      </View>

      {isFirstLoad ? (
        <ActivityIndicator color={colors.surface} style={styles.loader} />
      ) : balanceCents === null ? (
        <Pressable accessibilityRole="button" onPress={() => void refresh()}>
          <Text style={styles.error}>{error?.title ?? 'Balance unavailable'} · Tap to retry</Text>
        </Pressable>
      ) : (
        <Text
          style={styles.balance}
          accessibilityLabel={hidden ? 'Balance hidden' : `Available balance ${formatMoney(balanceCents)}`}
        >
          {hidden ? 'RM ••••••' : formatMoney(balanceCents)}
        </Text>
      )}

      {status === 'loading' && balanceCents !== null ? <Text style={styles.updating}>Updating…</Text> : null}
    </View>
  );
}

export const BalanceCard = memo(BalanceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.label, color: colors.primarySoft },
  balance: { ...typography.display, color: colors.surface, fontVariant: ['tabular-nums'] },
  loader: { alignSelf: 'flex-start', marginVertical: spacing.md },
  error: { ...typography.heading, color: colors.surface },
  updating: { ...typography.caption, color: colors.primarySoft },
});
