import { z } from 'zod';

import { formatMoney } from '@/utils/money';

/** Business rules. In production these come from the server per customer tier. */
export const TRANSFER_LIMITS = {
  minCents: 100, // RM 1.00
  maxCents: 1_000_000, // RM 10,000.00 per transfer
  noteMaxLength: 60,
} as const;

const recipientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  channel: z.enum(['account', 'mobile']),
});

/** Letters (any language), numbers, spaces and common punctuation — no control chars or markup. */
const SAFE_NOTE = /^[\p{L}\p{N}\p{Zs}.,!?'"()&@#%/:+\-]*$/u;

/**
 * Validation is a factory because one rule (balance) depends on live data.
 * Messages are written for the user: what went wrong *and* how to fix it.
 */
export function createTransferSchema(availableCents: number) {
  return z.object({
    recipient: recipientSchema.nullable().transform((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: 'Choose who you want to send money to.' });
        return z.NEVER;
      }
      return value;
    }),
    amountCents: z
      .number()
      .int()
      .superRefine((cents, ctx) => {
        const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
        if (cents <= 0) return fail('Enter an amount to send.');
        if (cents < TRANSFER_LIMITS.minCents)
          return fail(`The minimum transfer is ${formatMoney(TRANSFER_LIMITS.minCents)}.`);
        if (cents > TRANSFER_LIMITS.maxCents)
          return fail(`The maximum per transfer is ${formatMoney(TRANSFER_LIMITS.maxCents)}.`);
        if (cents > availableCents)
          return fail(`Insufficient balance. You have ${formatMoney(availableCents)} available.`);
      }),
    note: z
      .string()
      .trim()
      .max(TRANSFER_LIMITS.noteMaxLength, `Keep the note under ${TRANSFER_LIMITS.noteMaxLength} characters.`)
      .regex(SAFE_NOTE, 'Notes can only contain letters, numbers and basic punctuation.'),
  });
}

export type TransferSchema = ReturnType<typeof createTransferSchema>;
/** Shape of the form while the user is editing (recipient may be empty). */
export type TransferFormInput = z.input<TransferSchema>;
/** Shape after successful validation (recipient guaranteed). */
export type TransferFormOutput = z.output<TransferSchema>;

export const EMPTY_TRANSFER_FORM: TransferFormInput = {
  recipient: null,
  amountCents: 0,
  note: '',
};
