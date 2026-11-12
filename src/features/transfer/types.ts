import type { Recipient } from '@/features/recipients/types';

export type TransactionStatus = 'completed' | 'failed';

export interface Transaction {
  id: string;
  /** Human-readable reference shown on the receipt, e.g. "BP2611110001". */
  reference: string;
  recipient: Recipient;
  amountCents: number;
  note: string;
  /** ISO-8601 timestamp from the server. */
  createdAt: string;
  status: TransactionStatus;
  balanceAfterCents?: number;
}

export interface TransferRequest {
  /** Same key is re-sent on retry so the server can de-duplicate (no double debit). */
  idempotencyKey: string;
  recipient: Recipient;
  amountCents: number;
  note: string;
}

export interface TransferResponse {
  transaction: Transaction;
  newBalanceCents: number;
}
