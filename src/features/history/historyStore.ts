import { useMemo } from 'react';
import { create } from 'zustand';

import type { LoadStatus } from '@/features/account/accountStore';
import type { Recipient } from '@/features/recipients/types';
import type { Transaction } from '@/features/transfer/types';
import { api, toUserFacingError, type UserFacingError } from '@/services/api';

interface HistoryState {
  transactions: Transaction[];
  status: LoadStatus;
  error: UserFacingError | null;
  load: () => Promise<void>;
  /** Optimistically prepend a confirmed transaction (no refetch needed). */
  add: (transaction: Transaction) => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  transactions: [],
  status: 'idle',
  error: null,

  load: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const transactions = await api.listTransactions();
      set({ transactions, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: toUserFacingError(error) });
    }
  },

  add: (transaction) =>
    set((state) =>
      state.transactions.some((t) => t.id === transaction.id)
        ? state
        : { transactions: [transaction, ...state.transactions] },
    ),
}));

/** Pure so it can be unit-tested and memoised. */
export function deriveRecentRecipients(transactions: readonly Transaction[], limit = 8): Recipient[] {
  const seen = new Set<string>();
  const recent: Recipient[] = [];
  for (const tx of transactions) {
    if (tx.status !== 'completed' || seen.has(tx.recipient.accountNumber)) continue;
    seen.add(tx.recipient.accountNumber);
    recent.push(tx.recipient);
    if (recent.length === limit) break;
  }
  return recent;
}

/**
 * Derived data lives in a memoised hook, not a store selector: a selector that
 * returns a new array every call would re-render on every store update.
 */
export function useRecentRecipients(limit = 8): Recipient[] {
  const transactions = useHistoryStore((s) => s.transactions);
  return useMemo(() => deriveRecentRecipients(transactions, limit), [transactions, limit]);
}

export function useTransaction(id: string | undefined): Transaction | undefined {
  return useHistoryStore((s) => (id ? s.transactions.find((t) => t.id === id) : undefined));
}
