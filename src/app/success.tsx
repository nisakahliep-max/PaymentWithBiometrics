import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, DetailRow } from '@/components/ui';
import { useTransaction } from '@/features/history/historyStore';
import { maskIdentifier } from '@/features/recipients/identifiers';
import { useTransferDraftStore } from '@/features/transfer/transferDraftStore';
import { colors, spacing, typography } from '@/theme/tokens';
import { formatDateTime } from '@/utils/date';
import { formatMoney } from '@/utils/money';

/**
 * Receipt. Screenshots are deliberately allowed here (people share proof of
 * payment), and only the masked account number is shown.
 */
export default function SuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const resetDraft = useTransferDraftStore((s) => s.reset);

  // The transfer is done: clear the draft so the form starts fresh.
  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  if (!transaction) return <Redirect href="/" />;

  const { recipient } = transaction;
  const share = () =>
    Share.share({
      message: [
        'BioPay transfer receipt',
        `${formatMoney(transaction.amountCents)} to ${recipient.name}`,
        `${recipient.bankName} ${maskIdentifier(recipient.accountNumber)}`,
        `Ref: ${transaction.reference}`,
        formatDateTime(transaction.createdAt),
      ].join('\n'),
    });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.badge}>
          <Ionicons name="checkmark" size={48} color={colors.surface} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">
            Transfer successful
          </Text>
          <Text style={styles.amount}>{formatMoney(transaction.amountCents)}</Text>
          <Text style={styles.subtitle}>sent to {recipient.name}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <Card>
            <DetailRow label="To" value={recipient.name} />
            <DetailRow label="Account" value={`${recipient.bankName} ${maskIdentifier(recipient.accountNumber)}`} />
            <DetailRow label="Reference" value={transaction.reference} emphasis />
            <DetailRow label="Date & time" value={formatDateTime(transaction.createdAt)} />
            {transaction.note ? <DetailRow label="Note" value={transaction.note} /> : null}
            {transaction.balanceAfterCents !== undefined ? (
              <DetailRow label="New balance" value={formatMoney(transaction.balanceAfterCents)} />
            ) : null}
          </Card>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Button testID="done-button" title="Done" onPress={() => router.dismissTo('/')} />
        <Button
          title="Share receipt"
          variant="ghost"
          onPress={() => void share()}
          icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.xl, justifyContent: 'center' },
  badge: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { alignItems: 'center', gap: spacing.xs },
  title: { ...typography.title, color: colors.ink },
  amount: { ...typography.display, color: colors.ink, fontVariant: ['tabular-nums'] },
  subtitle: { ...typography.body, color: colors.inkMuted },
  footer: { padding: spacing.lg, gap: spacing.xs },
});
