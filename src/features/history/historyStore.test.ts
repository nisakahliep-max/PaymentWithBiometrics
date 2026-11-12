import type { Recipient } from '@/features/recipients/types';
import type { Transaction } from '@/features/transfer/types';

import { deriveRecentRecipients } from './historyStore';

const person = (n: number): Recipient => ({
  id: `r${n}`,
  name: `Person ${n}`,
  bankName: 'Maybank',
  accountNumber: `51234567890${n}`,
  channel: 'account',
});

const tx = (n: number, recipient: Recipient, status: Transaction['status'] = 'completed'): Transaction => ({
  id: `t${n}`,
  reference: `BP${n}`,
  recipient,
  amountCents: 1000,
  note: '',
  createdAt: new Date(2026, 10, 11 - n).toISOString(),
  status,
});

describe('deriveRecentRecipients', () => {
  it('returns unique recipients, most recent first, skipping failed transfers', () => {
    const [a, b, c] = [person(1), person(2), person(3)];
    const history = [tx(1, a), tx(2, b, 'failed'), tx(3, a), tx(4, c), tx(5, b)];
    expect(deriveRecentRecipients(history).map((r) => r.id)).toEqual(['r1', 'r3', 'r2']);
  });

  it('respects the limit', () => {
    const history = Array.from({ length: 20 }, (_, i) => tx(i, person(i)));
    expect(deriveRecentRecipients(history, 5)).toHaveLength(5);
  });
});
