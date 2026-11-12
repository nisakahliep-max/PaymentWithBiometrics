import { create } from 'zustand';

import type { LoadStatus } from '@/features/account/accountStore';
import { api, toUserFacingError, type UserFacingError } from '@/services/api';

import type { Recipient } from './types';

interface RecipientsState {
  saved: Recipient[];
  status: LoadStatus;
  error: UserFacingError | null;
  load: () => Promise<void>;
  /** Called after paying someone new (contact or looked-up number). */
  remember: (recipient: Recipient) => void;
}

export const useRecipientsStore = create<RecipientsState>()((set, get) => ({
  saved: [],
  status: 'idle',
  error: null,

  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const saved = await api.listRecipients();
      set({ saved, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: toUserFacingError(error) });
    }
  },

  remember: (recipient) =>
    set((state) =>
      state.saved.some((r) => r.accountNumber === recipient.accountNumber)
        ? state
        : { saved: [recipient, ...state.saved] },
    ),
}));
