import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useAccountStore } from '@/features/account/accountStore';

import { useTransferDraftStore } from './transferDraftStore';
import {
  createTransferSchema,
  EMPTY_TRANSFER_FORM,
  type TransferFormInput,
  type TransferFormOutput,
} from './transferSchema';

/**
 * Form state for the transfer screen.
 *
 * - react-hook-form keeps inputs uncontrolled-by-React-state, so typing in one
 *   field re-renders only that field's Controller, not the whole screen.
 * - The zod schema is rebuilt only when the balance changes.
 * - The draft store is the bridge to other screens: the recipient picker and
 *   "send again" write to it, and this hook mirrors those writes into the form.
 */
export function useTransferForm() {
  const router = useRouter();
  const balanceCents = useAccountStore((s) => s.balanceCents);
  const schema = useMemo(() => createTransferSchema(balanceCents ?? 0), [balanceCents]);

  const form = useForm<TransferFormInput, unknown, TransferFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_TRANSFER_FORM,
    mode: 'onTouched',
  });
  const { reset, setValue, getFieldState, handleSubmit } = form;

  // Draft replaced from outside (send again / reset after success).
  const revision = useTransferDraftStore((s) => s.revision);
  useEffect(() => {
    const { recipient, amountCents, note } = useTransferDraftStore.getState();
    reset({ recipient, amountCents, note });
  }, [revision, reset]);

  // Recipient chosen on the picker screen.
  const draftRecipient = useTransferDraftStore((s) => s.recipient);
  useEffect(() => {
    if (!draftRecipient) return;
    setValue('recipient', draftRecipient, {
      shouldDirty: true,
      shouldValidate: getFieldState('recipient').invalid,
    });
  }, [draftRecipient, setValue, getFieldState]);

  const commit = useTransferDraftStore((s) => s.commit);
  const onSubmit = useMemo(
    () =>
      handleSubmit((values) => {
        commit(values);
        router.push('/review');
      }),
    [handleSubmit, commit, router],
  );

  return { form, onSubmit, balanceCents };
}
