import { create } from 'zustand';

import type { Recipient } from '@/features/recipients/types';
import { createId } from '@/utils/id';

import type { TransferFormOutput } from './transferSchema';

/**
 * The transfer "in progress" shared between screens (form → recipients → review).
 *
 * Why a store and not route params? Params are strings, end up in deep-link URLs
 * and navigation state, and can be tampered with. Amounts and account numbers
 * stay in memory instead.
 */
interface TransferDraftState {
  recipient: Recipient | null;
  amountCents: number;
  note: string;
  /**
   * Generated once per draft and reused on every retry so the server can
   * de-duplicate. A new key is only created when the draft changes.
   */
  idempotencyKey: string;
  /** Bumped when the draft is replaced from outside the form (prefill/reset). */
  revision: number;

  selectRecipient: (recipient: Recipient) => void;
  /** Form submitted and validated — freeze the values for review. */
  commit: (values: TransferFormOutput) => void;
  /** "Send again" from history / recents. */
  prefill: (values: { recipient: Recipient; amountCents?: number; note?: string }) => void;
  reset: () => void;
}

export const useTransferDraftStore = create<TransferDraftState>()((set) => ({
  recipient: null,
  amountCents: 0,
  note: '',
  idempotencyKey: createId(),
  revision: 0,

  selectRecipient: (recipient) => set({ recipient }),

  commit: (values) =>
    set((state) => {
      const unchanged =
        state.recipient?.accountNumber === values.recipient.accountNumber &&
        state.amountCents === values.amountCents &&
        state.note === values.note;
      return {
        ...values,
        idempotencyKey: unchanged ? state.idempotencyKey : createId(),
      };
    }),

  prefill: ({ recipient, amountCents = 0, note = '' }) =>
    set((state) => ({
      recipient,
      amountCents,
      note,
      idempotencyKey: createId(),
      revision: state.revision + 1,
    })),

  reset: () =>
    set((state) => ({
      recipient: null,
      amountCents: 0,
      note: '',
      idempotencyKey: createId(),
      revision: state.revision + 1,
    })),
}));
