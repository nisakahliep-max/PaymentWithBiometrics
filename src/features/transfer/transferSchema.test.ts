import type { Recipient } from '@/features/recipients/types';

import { createTransferSchema } from './transferSchema';

const recipient: Recipient = {
  id: 'r1',
  name: 'Aisyah Rahman',
  bankName: 'Maybank',
  accountNumber: '512345678901',
  channel: 'account',
};

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('createTransferSchema', () => {
  const schema = createTransferSchema(50_000); // RM 500.00 available

  it('accepts a valid transfer and trims the note', () => {
    const result = schema.safeParse({ recipient, amountCents: 12_000, note: '  Lunch  ' });
    expect(result.success).toBe(true);
    expect(result.data?.note).toBe('Lunch');
  });

  it('requires a recipient', () => {
    const result = schema.safeParse({ recipient: null, amountCents: 12_000, note: '' });
    expect(firstError(result)).toBe('Choose who you want to send money to.');
  });

  it.each([
    [0, 'Enter an amount to send.'],
    [50, 'The minimum transfer is RM 1.00.'],
    [1_000_001, 'The maximum per transfer is RM 10,000.00.'],
  ])('rejects amount %i with a helpful message', (amountCents, message) => {
    const richSchema = createTransferSchema(5_000_000); // balance is not the limiting rule here
    expect(firstError(richSchema.safeParse({ recipient, amountCents, note: '' }))).toBe(message);
  });

  it('rejects amounts above the available balance and says how much is available', () => {
    const result = schema.safeParse({ recipient, amountCents: 50_001, note: '' });
    expect(firstError(result)).toBe('Insufficient balance. You have RM 500.00 available.');
  });

  // DuitNow references only allow a restricted character set, so emoji/markup are rejected.
  it('rejects notes that are too long or contain markup/emoji', () => {
    expect(schema.safeParse({ recipient, amountCents: 1000, note: 'x'.repeat(61) }).success).toBe(false);
    expect(schema.safeParse({ recipient, amountCents: 1000, note: '<script>' }).success).toBe(false);
    expect(schema.safeParse({ recipient, amountCents: 1000, note: 'Duit raya 🎉' }).success).toBe(false);
    expect(schema.safeParse({ recipient, amountCents: 1000, note: 'Sewa rumah - Nov' }).success).toBe(true);
  });
});
