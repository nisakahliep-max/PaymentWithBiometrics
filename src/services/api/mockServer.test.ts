import type { Recipient } from '@/features/recipients/types';
import type { TransferRequest } from '@/features/transfer/types';

import { api, ApiError } from './index';
import { SEED_BALANCE_CENTS } from './mockData';
import { DEMO_AMOUNTS, resetMockServer } from './mockServer';
import { configureMock } from './simulate';

let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));

const recipient: Recipient = {
  id: 'r1',
  name: 'Aisyah Rahman',
  bankName: 'Maybank',
  accountNumber: '512345678901',
  channel: 'account',
};

const request = (overrides: Partial<TransferRequest> = {}): TransferRequest => ({
  idempotencyKey: `key-${Math.random()}`,
  recipient,
  amountCents: 2500,
  note: 'Lunch',
  ...overrides,
});

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (e: ApiError) => e.code,
  );

beforeEach(() => {
  configureMock({ minLatencyMs: 0, maxLatencyMs: 0, timeoutMs: 50 });
  resetMockServer();
});

describe('mock transfer API', () => {
  it('debits the balance and returns a receipt', async () => {
    const { transaction, newBalanceCents } = await api.submitTransfer(request());
    expect(newBalanceCents).toBe(SEED_BALANCE_CENTS - 2500);
    expect(transaction.reference).toMatch(/^BP\d{10}$/);
    expect(transaction.status).toBe('completed');
  });

  it('re-validates on the server: rejects amounts above the balance', async () => {
    // Seed balance is RM 12,450.75: the first RM 9,000 succeeds, the second must not.
    await api.submitTransfer(request({ amountCents: 900_000 }));
    await expect(codeOf(api.submitTransfer(request({ amountCents: 900_000 })))).resolves.toBe('INSUFFICIENT_FUNDS');
  });

  it('rejects amounts above the per-transfer limit', async () => {
    await expect(codeOf(api.submitTransfer(request({ amountCents: 1_000_001 })))).resolves.toBe('LIMIT_EXCEEDED');
  });

  it('network error on first attempt, success on retry with the same key', async () => {
    const req = request({ amountCents: DEMO_AMOUNTS.networkError });
    await expect(codeOf(api.submitTransfer(req))).resolves.toBe('NETWORK_ERROR');
    const { newBalanceCents } = await api.submitTransfer(req);
    expect(newBalanceCents).toBe(SEED_BALANCE_CENTS - DEMO_AMOUNTS.networkError);
  });

  it('is idempotent: a lost response + retry debits only once', async () => {
    const req = request({ amountCents: DEMO_AMOUNTS.responseLost });
    await expect(codeOf(api.submitTransfer(req))).resolves.toBe('NETWORK_ERROR');
    const retry = await api.submitTransfer(req);
    const again = await api.submitTransfer(req);
    expect(retry.transaction.id).toBe(again.transaction.id);
    expect(again.newBalanceCents).toBe(SEED_BALANCE_CENTS - DEMO_AMOUNTS.responseLost);
    const account = await api.getAccount();
    expect(account.balanceCents).toBe(SEED_BALANCE_CENTS - DEMO_AMOUNTS.responseLost);
  });

  it('times out slow requests without debiting', async () => {
    const req = request({ amountCents: DEMO_AMOUNTS.timeout });
    await expect(codeOf(api.submitTransfer(req))).resolves.toBe('TIMEOUT');
    expect((await api.getAccount()).balanceCents).toBe(SEED_BALANCE_CENTS);
  });

  it('surfaces a retryable server error once', async () => {
    const req = request({ amountCents: DEMO_AMOUNTS.serverError });
    await expect(api.submitTransfer(req)).rejects.toMatchObject({ code: 'SERVER_ERROR', retryable: true });
    await expect(codeOf(api.submitTransfer(req))).resolves.toBe('ok');
  });

  it('can be aborted by the caller', async () => {
    configureMock({ minLatencyMs: 1000, maxLatencyMs: 1000, timeoutMs: 5000 });
    const controller = new AbortController();
    const pending = codeOf(api.submitTransfer(request(), controller.signal));
    controller.abort();
    await expect(pending).resolves.toBe('ABORTED');
  });

  it('name enquiry resolves a recipient or reports not found', async () => {
    const found = await api.lookupRecipient('mobile', '0123456789');
    expect(found).toMatchObject({ channel: 'mobile', accountNumber: '0123456789' });
    await expect(codeOf(api.lookupRecipient('mobile', '0123450000'))).resolves.toBe('RECIPIENT_NOT_FOUND');
  });
});
