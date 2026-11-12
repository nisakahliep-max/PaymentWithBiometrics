import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useAccountStore } from '@/features/account/accountStore';
import { useTransactionAuth } from '@/features/auth/useTransactionAuth';
import { useHistoryStore } from '@/features/history/historyStore';
import { useRecipientsStore } from '@/features/recipients/recipientsStore';
import { api, toUserFacingError, type UserFacingError } from '@/services/api';
import { formatMoney } from '@/utils/money';

import { useTransferDraftStore } from './transferDraftStore';

export interface SubmitNotice {
  /** API error code, or AUTH_* when the failure happened before any request. */
  code: UserFacingError['code'] | 'AUTH_CANCELLED' | 'AUTH_FAILED';
  tone: 'error' | 'warning';
  title: string;
  message: string;
  retryable: boolean;
}

/**
 * Explicit state machine — impossible states (e.g. "processing" *and* "error")
 * can't be represented, and the UI is a pure function of `phase`.
 *
 *   idle ─▶ authenticating ─▶ processing ─▶ succeeded ─▶ (navigate to receipt)
 *              │                  │
 *              └──────▶ failed ◀──┘ ── retry ─▶ authenticating
 *
 * `succeeded` exists so navigation happens *after* `busy` drops: the Review
 * screen blocks removal while busy, which would otherwise swallow the
 * `router.replace` to the receipt and strand the user on a spinner.
 */
export type SubmitState =
  | { phase: 'idle' }
  | { phase: 'authenticating' }
  | { phase: 'processing' }
  | { phase: 'succeeded'; transactionId: string }
  | { phase: 'failed'; notice: SubmitNotice };

type Action =
  | { type: 'authenticate' }
  | { type: 'process' }
  | { type: 'succeed'; transactionId: string }
  | { type: 'fail'; notice: SubmitNotice }
  | { type: 'reset' };

function reducer(_state: SubmitState, action: Action): SubmitState {
  switch (action.type) {
    case 'authenticate':
      return { phase: 'authenticating' };
    case 'process':
      return { phase: 'processing' };
    case 'succeed':
      return { phase: 'succeeded', transactionId: action.transactionId };
    case 'fail':
      return { phase: 'failed', notice: action.notice };
    case 'reset':
      return { phase: 'idle' };
  }
}

export function useSubmitTransfer() {
  const router = useRouter();
  const { authorize, pinModalProps } = useTransactionAuth();
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  /** Synchronous guard: a ref flips immediately, state would allow a double-tap through. */
  const inFlight = useRef(false);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    const { recipient, amountCents, note, idempotencyKey } = useTransferDraftStore.getState();
    if (!recipient) return;
    inFlight.current = true;

    try {
      // 1. Authenticate *this* transfer. The prompt names amount and payee so the
      //    user knows exactly what they are approving.
      dispatch({ type: 'authenticate' });
      const auth = await authorize(`Send ${formatMoney(amountCents)} to ${recipient.name}`);
      if (!auth.ok) {
        dispatch({
          type: 'fail',
          notice:
            auth.reason === 'cancelled'
              ? {
                  code: 'AUTH_CANCELLED',
                  tone: 'warning',
                  title: 'Transfer not sent',
                  message: 'Verification was cancelled, so no money has moved.',
                  retryable: true,
                }
              : {
                  code: 'AUTH_FAILED',
                  tone: 'error',
                  title: auth.reason === 'locked_out' ? 'Verification locked' : 'Verification failed',
                  message: auth.message ?? 'We couldn’t verify it’s you. No money has moved.',
                  retryable: auth.reason !== 'locked_out',
                },
        });
        return;
      }

      // 2. Process. The idempotency key comes from the draft, so a retry after a
      //    timeout can never debit twice.
      dispatch({ type: 'process' });
      const { transaction, newBalanceCents } = await api.submitTransfer({
        idempotencyKey,
        recipient,
        amountCents,
        note,
      });

      // 3. Update local state from the server's response (source of truth).
      useHistoryStore.getState().add(transaction);
      useAccountStore.getState().setBalance(newBalanceCents);
      useRecipientsStore.getState().remember(recipient);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch({ type: 'succeed', transactionId: transaction.id });
    } catch (error) {
      const failure = toUserFacingError(error);
      if (failure.code === 'INSUFFICIENT_FUNDS') void useAccountStore.getState().refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      dispatch({ type: 'fail', notice: { tone: 'error', ...failure } });
    } finally {
      inFlight.current = false;
    }
  }, [authorize]);

  // Runs after the commit where `busy` became false, by which point the Review
  // screen's removal guard (a layout effect) has already been lifted.
  const succeededId = state.phase === 'succeeded' ? state.transactionId : null;
  useEffect(() => {
    if (succeededId) router.replace({ pathname: '/success', params: { id: succeededId } });
  }, [succeededId, router]);

  const busy = state.phase === 'authenticating' || state.phase === 'processing';
  return { state, busy, submit, pinModalProps };
}
