/**
 * How the money is routed. In Malaysia, DuitNow lets you pay either a bank
 * account number or a registered mobile number (proxy) — this support both.
 */
export type RecipientChannel = 'account' | 'mobile';

export interface Recipient {
  id: string;
  name: string;
  bankName: string;
  /** Account number or normalised mobile number (e.g. 0123456789). */
  accountNumber: string;
  channel: RecipientChannel;
}
