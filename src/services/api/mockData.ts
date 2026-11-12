import type { Recipient } from '@/features/recipients/types';
import type { Transaction } from '@/features/transfer/types';

/**
 * Deterministic seed data. A seeded PRNG means every run (and every reviewer)
 * sees the same 1,000 recipients and 400 transactions — large enough to prove the
 * lists stay smooth, stable enough to write a demo script against.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261111);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
const digits = (count: number) => Array.from({ length: count }, () => Math.floor(rand() * 10)).join('');

const FIRST_NAMES = [
  'Aisyah', 'Ahmad', 'Nurul', 'Muhammad', 'Siti', 'Hafiz', 'Farah', 'Amir', 'Wei Ming', 'Mei Ling',
  'Jun Hao', 'Xin Yi', 'Kok Leong', 'Priya', 'Arjun', 'Kavitha', 'Ravi', 'Deepa', 'Daniel', 'Sarah',
] as const;
const LAST_NAMES = [
  'Rahman', 'Ismail', 'Abdullah', 'Hassan', 'Yusof', 'Tan', 'Lim', 'Wong', 'Lee', 'Ng',
  'Chong', 'Subramaniam', 'Krishnan', 'Pillai', 'Nair', 'Raj', 'Ong', 'Teoh', 'Aziz', 'Othman',
] as const;
export const BANKS = [
  'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank', 'AmBank',
  'Bank Islam', 'BSN', 'Alliance Bank', 'OCBC Malaysia', 'UOB Malaysia', 'HSBC Malaysia',
] as const;
const NOTES = ['', '', '', 'Lunch', 'Rent - Nov', 'Badminton court', 'Thanks!', 'Groceries', 'Petrol', 'Birthday gift', 'Utilities', 'Kopi'] as const;

function buildRecipients(count: number): Recipient[] {
  return Array.from({ length: count }, (_, i) => {
    const isMobile = rand() < 0.35;
    return {
      id: `rcp_${i.toString().padStart(4, '0')}`,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      bankName: isMobile ? 'DuitNow (Mobile)' : pick(BANKS),
      accountNumber: isMobile ? `01${pick(['2', '3', '6', '7', '9'])}${digits(7)}` : digits(12),
      channel: isMobile ? 'mobile' : 'account',
    };
  });
}

function buildTransactions(count: number, recipients: Recipient[]): Transaction[] {
  const now = Date.now();
  const DAY = 86_400_000;
  // Most transfers go to a small circle of people, like real usage — this makes
  // the "recent recipients" strip meaningful.
  const frequent = recipients.slice(0, 12);
  return Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(now - i * (DAY * 0.45) - Math.floor(rand() * DAY * 0.3)).toISOString();
    const recipient = rand() < 0.7 ? pick(frequent) : pick(recipients);
    return {
      id: `txn_seed_${i}`,
      reference: `BP${(100000 + i).toString()}`,
      recipient,
      amountCents: (5 + Math.floor(rand() * 600)) * 100 + Math.floor(rand() * 100),
      note: pick(NOTES),
      createdAt,
      status: rand() < 0.97 ? 'completed' : 'failed',
    } satisfies Transaction;
  });
}

export const SEED_BALANCE_CENTS = 1_245_075; // RM 12,450.75
export const SEED_RECIPIENTS = buildRecipients(1000);
export const SEED_TRANSACTIONS = buildTransactions(400, SEED_RECIPIENTS);
export const ACCOUNT_HOLDER = { name: 'Nisa', accountNumber: '514012345678', bankName: 'BioPay Bank' };
