import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { ErrorBanner } from '@/components/ui';
import { groupByMonth, type HistoryRow } from '@/features/history/groupByMonth';
import { useHistoryStore } from '@/features/history/historyStore';
import { TransactionRow } from '@/features/history/TransactionRow';
import { useTransferDraftStore } from '@/features/transfer/transferDraftStore';
import type { Transaction } from '@/features/transfer/types';
import { colors, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

/**
 * 400+ transactions in one virtualised FlashList with sticky month headers.
 * Tap any transfer to send it again (same or new amount).
 */
export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, status, error, load } = useHistoryStore(
    useShallow((s) => ({ transactions: s.transactions, status: s.status, error: s.error, load: s.load })),
  );
  const prefill = useTransferDraftStore((s) => s.prefill);
  const { rows, headerIndices } = useMemo(() => groupByMonth(transactions), [transactions]);

  const sendAgain = useCallback(
    (transaction: Transaction) => {
      const { recipient, amountCents, note } = transaction;
      const go = (withAmount: boolean) => {
        prefill(withAmount ? { recipient, amountCents, note } : { recipient });
        router.dismissTo('/');
      };
      Alert.alert(`Send again to ${recipient.name}?`, undefined, [
        { text: `Same amount (${formatMoney(amountCents)})`, onPress: () => go(true) },
        { text: 'Different amount', onPress: () => go(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [prefill, router],
  );

  const renderItem: ListRenderItem<HistoryRow> = useCallback(
    ({ item }) =>
      item.type === 'header' ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{item.title}</Text>
          <Text style={styles.headerTotal}>{formatMoney(-item.totalCents)}</Text>
        </View>
      ) : (
        <TransactionRow transaction={item.transaction} onPress={sendAgain} />
      ),
    [sendAgain],
  );

  if (status === 'loading' && transactions.length === 0) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {status === 'error' && error ? (
        <View style={styles.banner}>
          <ErrorBanner title={error.title} message={error.message} actionLabel="Try again" onAction={() => void load()} />
        </View>
      ) : null}
      <FlashList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        stickyHeaderIndices={headerIndices}
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={() => void load()} />}
        ListEmptyComponent={
          status === 'ready' ? <Text style={styles.empty}>No transfers yet. Your sent payments will appear here.</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xxl },
  banner: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  headerTitle: { ...typography.label, color: colors.ink },
  headerTotal: { ...typography.label, color: colors.inkMuted },
  empty: { ...typography.body, color: colors.inkMuted, textAlign: 'center', padding: spacing.xl },
});
