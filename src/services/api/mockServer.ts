import type { Recipient, RecipientChannel } from '@/features/recipients/types';
import { TRANSFER_LIMITS } from '@/features/transfer/transferSchema';
import type { Transaction, TransferRequest, TransferResponse } from '@/features/transfer/types';
import { createId } from '@/utils/id';

import { ApiError } from './errors';
import { ACCOUNT_HOLDER, BANKS, SEED_BALANCE_CENTS, SEED_RECIPIENTS, SEED_TRANSACTIONS } from './mockData';
import { randomLatency, sleep } from './simulate';

/**
 * In-memory stand-in for the bank's backend. It behaves like a real server would:
 * it re-validates everything (the client is never trusted), owns the balance,
 * and de-duplicates transfers by idempotency key.
 *
 * DEMO TRIGGERS — specific amounts force specific failures so every error path
 * can be shown on video. Transient ones fail only on the *first* attempt, so
 * "Retry" visibly succeeds:
 *   RM 13.13  network drops before the request reaches the server (no debit)
 *   RM 42.42  server debits, then the response is lost — retry returns the SAME
 *             transaction and the balance is debited once (idempotency)
 *   RM 99.99  server is slow → client times out
 *   RM 50.05  server returns 503
 *   RM 77.77  balance changed elsewhere → insufficient funds
 *   Recipient lookups for numbers ending in 0000 → not found
 */
export const DEMO_AMOUNTS = {
  networkError: 1313,
  responseLost: 4242,
  timeout: 9999,
  serverError: 5005,
  insufficientFunds: 7777,
} as const;

interface ServerState {
  balanceCents: number;
  transactions: Transaction[];
  /** idempotencyKey -> result of the first successful processing. */
  processed: Map<string, TransferResponse>;
  /** idempotency keys that have already had their one-off demo failure. */
  failedOnce: Set<string>;
  sequence: number;
}

const createInitialState = (): ServerState => ({
  balanceCents: SEED_BALANCE_CENTS,
  transactions: [...SEED_TRANSACTIONS],
  processed: new Map(),
  failedOnce: new Set(),
  sequence: 0,
});

let state = createInitialState();

/** Test helper: start every test from a clean server. */
export function resetMockServer() {
  state = createInitialState();
}

function failOnce(key: string, error: ApiError) {
  if (state.failedOnce.has(key)) return;
  state.failedOnce.add(key);
  throw error;
}

function nextReference(): string {
  state.sequence += 1;
  const now = new Date();
  const ymd = `${now.getFullYear() % 100}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `BP${ymd}${String(state.sequence).padStart(4, '0')}`;
}

export const mockServer = {
  async getAccount(signal?: AbortSignal) {
    await sleep(randomLatency(), signal);
    return { ...ACCOUNT_HOLDER, balanceCents: state.balanceCents };
  },

  async listRecipients(signal?: AbortSignal): Promise<Recipient[]> {
    await sleep(randomLatency(), signal);
    return SEED_RECIPIENTS;
  },

  async listTransactions(signal?: AbortSignal): Promise<Transaction[]> {
    await sleep(randomLatency(), signal);
    return [...state.transactions];
  },

  /** "Name enquiry": resolves who owns an account / DuitNow mobile before paying. */
  async lookupRecipient(channel: RecipientChannel, value: string, signal?: AbortSignal): Promise<Recipient> {
    await sleep(randomLatency(), signal);
    if (value.endsWith('0000')) throw new ApiError('RECIPIENT_NOT_FOUND');
    const seedIndex = parseInt(value.slice(-3), 10) % SEED_RECIPIENTS.length;
    const name = SEED_RECIPIENTS[seedIndex]?.name ?? 'Account Holder';
    return {
      id: `rcp_${channel}_${value}`,
      name,
      bankName: channel === 'mobile' ? 'DuitNow (Mobile)' : (BANKS[seedIndex % BANKS.length] ?? 'Maybank'),
      accountNumber: value,
      channel,
    };
  },

  async submitTransfer(request: TransferRequest, signal?: AbortSignal): Promise<TransferResponse> {
    const { idempotencyKey: key, amountCents } = request;

    // 1. Network fails before reaching the server.
    if (amountCents === DEMO_AMOUNTS.networkError) {
      await sleep(randomLatency(), signal);
      failOnce(key, new ApiError('NETWORK_ERROR'));
    }

    await sleep(amountCents === DEMO_AMOUNTS.timeout && !state.failedOnce.has(key) ? 60_000 : randomLatency(), signal);
    if (amountCents === DEMO_AMOUNTS.timeout) state.failedOnce.add(key);

    // 2. Idempotency: a retry of an already-processed request returns the original result.
    const previous = state.processed.get(key);
    if (previous) return previous;

    if (amountCents === DEMO_AMOUNTS.serverError) failOnce(key, new ApiError('SERVER_ERROR'));
    if (amountCents === DEMO_AMOUNTS.insufficientFunds) {
      state.balanceCents = Math.min(state.balanceCents, amountCents - 1);
    }

    // 3. Server-side validation — never trust the client.
    if (!Number.isInteger(amountCents) || amountCents < TRANSFER_LIMITS.minCents || !request.recipient?.id) {
      throw new ApiError('INVALID_REQUEST');
    }
    if (amountCents > TRANSFER_LIMITS.maxCents) throw new ApiError('LIMIT_EXCEEDED');
    if (amountCents > state.balanceCents) throw new ApiError('INSUFFICIENT_FUNDS');

    // 4. Commit atomically.
    state.balanceCents -= amountCents;
    const transaction: Transaction = {
      id: createId(),
      reference: nextReference(),
      recipient: request.recipient,
      amountCents,
      note: request.note,
      createdAt: new Date().toISOString(),
      status: 'completed',
      balanceAfterCents: state.balanceCents,
    };
    const response: TransferResponse = { transaction, newBalanceCents: state.balanceCents };
    state.transactions.unshift(transaction);
    state.processed.set(key, response);

    // 5. Response lost on the way back (the debit already happened).
    if (amountCents === DEMO_AMOUNTS.responseLost) failOnce(key, new ApiError('NETWORK_ERROR'));

    return response;
  },
};
