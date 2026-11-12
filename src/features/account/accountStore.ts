import { create } from 'zustand';

import { api, toUserFacingError, type UserFacingError } from '@/services/api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AccountState {
  holderName: string;
  accountNumber: string;
  /** null until the first successful fetch — never show a fake "RM 0.00". */
  balanceCents: number | null;
  status: LoadStatus;
  error: UserFacingError | null;
  refresh: () => Promise<void>;
  setBalance: (cents: number) => void;
}

let inFlight: Promise<void> | null = null;

/**
 * Account summary. Components subscribe with narrow selectors, e.g.
 * `useAccountStore((s) => s.balanceCents)`, so a status change does not
 * re-render a component that only shows the balance.
 */
export const useAccountStore = create<AccountState>()((set) => ({
  holderName: '',
  accountNumber: '',
  balanceCents: null,
  status: 'idle',
  error: null,

  refresh: () => {
    // De-duplicate concurrent refreshes (pull-to-refresh + focus + error handler).
    inFlight ??= (async () => {
      set({ status: 'loading', error: null });
      try {
        const account = await api.getAccount();
        set({
          holderName: account.name,
          accountNumber: account.accountNumber,
          balanceCents: account.balanceCents,
          status: 'ready',
        });
      } catch (error) {
        set({ status: 'error', error: toUserFacingError(error) });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  setBalance: (cents) => set({ balanceCents: cents }),
}));
