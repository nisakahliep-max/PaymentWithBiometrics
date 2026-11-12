import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Controller, useWatch } from 'react-hook-form';

import { Button, Screen, TextField } from '@/components/ui';
import { useAccountStore } from '@/features/account/accountStore';
import { BalanceCard } from '@/features/account/BalanceCard';
import { RecentRecipients } from '@/features/recipients/RecentRecipients';
import type { Recipient } from '@/features/recipients/types';
import { AmountInput } from '@/features/transfer/AmountInput';
import { RecipientField } from '@/features/transfer/RecipientField';
import { useTransferDraftStore } from '@/features/transfer/transferDraftStore';
import { TRANSFER_LIMITS } from '@/features/transfer/transferSchema';
import { useTransferForm } from '@/features/transfer/useTransferForm';
import { colors } from '@/theme/tokens';

export default function TransferScreen() {
  const router = useRouter();
  const { form, onSubmit, balanceCents } = useTransferForm();
  const { control } = form;
  const selectRecipient = useTransferDraftStore((s) => s.selectRecipient);
  const refreshing = useAccountStore((s) => s.status === 'loading' && s.balanceCents !== null);
  const refresh = useAccountStore((s) => s.refresh);
  const selectedRecipient = useWatch({ control, name: 'recipient' });

  const openRecipients = useCallback(() => router.push('/recipients'), [router]);
  const pickRecent = useCallback((r: Recipient) => selectRecipient(r), [selectRecipient]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/history" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Transfer history" hitSlop={12}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        footer={
          <Button
            testID="continue-button"
            title="Continue"
            onPress={() => void onSubmit()}
            disabled={balanceCents === null}
            accessibilityHint="Review the transfer before confirming"
          />
        }
      >
        <BalanceCard />

        <RecentRecipients selectedAccount={selectedRecipient?.accountNumber} onSelect={pickRecent} />

        <Controller
          control={control}
          name="recipient"
          render={({ field, fieldState }) => (
            <RecipientField recipient={field.value} onPress={openRecipients} error={fieldState.error?.message} />
          )}
        />

        <Controller
          control={control}
          name="amountCents"
          render={({ field, fieldState }) => (
            <AmountInput
              valueCents={field.value}
              onChangeCents={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              availableCents={balanceCents}
            />
          )}
        />

        <Controller
          control={control}
          name="note"
          render={({ field, fieldState }) => (
            <TextField
              label="Note (optional)"
              placeholder="What’s it for?"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={TRANSFER_LIMITS.noteMaxLength}
              error={fieldState.error?.message}
              helper={`${field.value.length}/${TRANSFER_LIMITS.noteMaxLength}`}
              returnKeyType="done"
              autoCorrect={false}
              style={styles.note}
            />
          )}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  note: { minHeight: 48 },
});
