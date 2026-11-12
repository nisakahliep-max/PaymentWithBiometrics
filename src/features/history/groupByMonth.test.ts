import type { Transaction } from '@/features/transfer/types';

import { groupByMonth } from './groupByMonth';

const recipient = { id: 'r', name: 'A', bankName: 'B', accountNumber: '0123456789', channel: 'mobile' } as const;
const tx = (id: string, iso: string, amountCents: number, status: Transaction['status'] = 'completed'): Transaction => ({
  id,
  reference: id,
  recipient,
  amountCents,
  note: '',
  createdAt: iso,
  status,
});

describe('groupByMonth', () => {
  it('inserts a header per month, tracks header indices and sums completed transfers', () => {
    const { rows, headerIndices } = groupByMonth([
      tx('1', '2026-11-10T10:00:00Z', 1000),
      tx('2', '2026-11-02T10:00:00Z', 500, 'failed'),
      tx('3', '2026-10-30T10:00:00Z', 250),
    ]);
    expect(rows.map((r) => r.type)).toEqual(['header', 'transaction', 'transaction', 'header', 'transaction']);
    expect(headerIndices).toEqual([0, 3]);
    expect(rows[0]).toMatchObject({ type: 'header', totalCents: 1000 });
    expect(rows[3]).toMatchObject({ type: 'header', totalCents: 250 });
  });

  it('handles an empty list', () => {
    expect(groupByMonth([])).toEqual({ rows: [], headerIndices: [] });
  });
});
