import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Stack, usePreventRemove, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';

import { Avatar, Button, Card, DetailRow, ErrorBanner, Screen } from '@/components/ui';
import { useAccountStore } from '@/features/account/accountStore';
import { PinModal } from '@/features/auth/PinModal';
import { useSecureScreen } from '@/features/auth/useSecureScreen';
import { useBiometricCapability } from '@/features/auth/useTransactionAuth';
import { useTransferDraftStore } from '@/features/transfer/transferDraftStore';
import { useSubmitTransfer } from '@/features/transfer/useSubmitTransfer';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

export default function ReviewScreen() {
  useSecureScreen(); // no screenshots/recordings of payment details

  const router = useRouter();
  const draft = useTransferDraftStore(
    useShallow((s) => ({ recipient: s.recipient, amountCents: s.amountCents, note: s.note })),
  );
  const balanceCents = useAccountStore((s) => s.balanceCents);
  const capability = useBiometricCapability();
  const { state, busy, submit, pinModalProps } = useSubmitTransfer();

  // Block back gesture / Android back button while money may be moving.
  usePreventRemove(busy, () => {});

  // Deep link or app restore with no draft — nothing to review.
  if (!draft.recipient) return <Redirect href="/" />;

  const authLabel = capability?.available ? capability.label : 'your transaction PIN';
  const authShortLabel = capability?.available ? capability.label : 'PIN';
  const authIcon = capability?.available && capability.kind === 'face' ? 'scan-outline' : 'finger-print-outline';
  const ctaTitle =
    state.phase === 'authenticating'
      ? 'Verifying…'
      : state.phase === 'processing'
        ? 'Sending…'
        : state.phase === 'failed' && state.notice.retryable
          ? 'Try again'
          : `Confirm with ${authShortLabel}`;

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !busy, headerBackVisible: !busy }} />
      <Screen
        footer={
          <View style={styles.footer}>
            <Button
              testID="confirm-button"
              title={ctaTitle}
              loading={busy}
              disabled={state.phase === 'failed' && !state.notice.retryable}
              onPress={() => void submit()}
              icon={<Ionicons name={capability?.available ? authIcon : 'keypad-outline'} size={20} color={colors.surface} />}
              accessibilityHint={`You will be asked to verify with ${authLabel}`}
            />
            <Button title="Edit details" variant="ghost" disabled={busy} onPress={() => router.back()} />
          </View>
        }
      >
        <Animated.View entering={FadeInDown.duration(250)} style={styles.hero}>
          <Text style={styles.heroLabel}>You’re sending</Text>
          <Text style={styles.amount} accessibilityLabel={`Amount ${formatMoney(draft.amountCents)}`}>
            {formatMoney(draft.amountCents)}
          </Text>
        </Animated.View>

        <Card style={styles.recipientCard}>
          <Avatar name={draft.recipient.name} size={48} />
          <View style={styles.recipientText}>
            <Text style={styles.recipientName}>{draft.recipient.name}</Text>
            <Text style={styles.recipientMeta}>
              {draft.recipient.bankName} · {draft.recipient.accountNumber}
            </Text>
          </View>
        </Card>

        <Card>
          <DetailRow label="Transfer type" value="DuitNow Transfer" />
          <DetailRow label="Fee" value="Free" />
          {draft.note ? <DetailRow label="Note" value={draft.note} /> : null}
          {balanceCents !== null ? (
            <DetailRow label="Balance after" value={formatMoney(balanceCents - draft.amountCents)} />
          ) : null}
        </Card>

        {state.phase === 'failed' ? (
          <ErrorBanner
            title={state.notice.title}
            message={state.notice.message}
            tone={state.notice.tone}
            actionLabel={state.notice.code === 'INSUFFICIENT_FUNDS' ? 'Change amount' : undefined}
            onAction={state.notice.code === 'INSUFFICIENT_FUNDS' ? () => router.back() : undefined}
          />
        ) : (
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.securityText}>
              For your security, you’ll confirm this transfer with {authLabel}. Transfers can’t be reversed once sent.
            </Text>
          </View>
        )}
      </Screen>

      {/* Kept up through `succeeded` so the screen underneath (whose balance has
          already been debited) isn't revealed in the frame before navigation. */}
      {state.phase === 'processing' || state.phase === 'succeeded' ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.overlay]} accessibilityViewIsModal>
          <View style={styles.overlayCard} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayTitle}>Sending {formatMoney(draft.amountCents)}</Text>
            <Text style={styles.overlayBody}>Please keep the app open.</Text>
          </View>
        </Animated.View>
      ) : null}

      <PinModal {...pinModalProps} />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  heroLabel: { ...typography.body, color: colors.inkMuted },
  amount: { ...typography.display, fontSize: 40, color: colors.ink, fontVariant: ['tabular-nums'] },
  recipientCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recipientText: { flex: 1, gap: 2 },
  recipientName: { ...typography.heading, color: colors.ink },
  recipientMeta: { ...typography.caption, color: colors.inkMuted },
  securityNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  securityText: { ...typography.caption, color: colors.ink, flex: 1 },
  overlay: {
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 240,
  },
  overlayTitle: { ...typography.heading, color: colors.ink },
  overlayBody: { ...typography.caption, color: colors.inkMuted },
});
