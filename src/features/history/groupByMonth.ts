import type { Transaction } from '@/features/transfer/types';
import { formatMonth } from '@/utils/date';

type HeaderRow = { type: 'header'; key: string; title: string; totalCents: number };
export type HistoryRow = HeaderRow | { type: 'transaction'; key: string; transaction: Transaction };

/**
 * Flattens transactions (newest first) into header + row items for a single
 * FlashList, and returns header indices for sticky section headers. One flat
 * list recycles far better than nested SectionList sections.
 */
export function groupByMonth(transactions: readonly Transaction[]): { rows: HistoryRow[]; headerIndices: number[] } {
  const rows: HistoryRow[] = [];
  const headerIndices: number[] = [];
  let currentHeader = null as HeaderRow | null;

  for (const transaction of transactions) {
    const title = formatMonth(transaction.createdAt);
    if (currentHeader?.title !== title) {
      currentHeader = { type: 'header', key: `h:${title}`, title, totalCents: 0 };
      headerIndices.push(rows.length);
      rows.push(currentHeader);
    }
    if (transaction.status === 'completed') currentHeader.totalCents += transaction.amountCents;
    rows.push({ type: 'transaction', key: transaction.id, transaction });
  }
  return { rows, headerIndices };
}
