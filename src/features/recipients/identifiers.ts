import type { RecipientChannel } from './types';

/** Malaysian mobile numbers: 01X-XXX XXXX (10 digits) or 011-XXXX XXXX (11 digits). */
const MY_MOBILE = /^01\d{8,9}$/;
/** Malaysian bank account numbers range from 10 to 16 digits depending on the bank. */
const ACCOUNT_NUMBER = /^\d{10,16}$/;

/** "+60 12-345 6789" / "6012 345 6789" / "012-3456789" -> "0123456789" */
export function normalizeMyMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('60')) return `0${digits.slice(2)}`;
  return digits;
}

export function isValidMyMobile(raw: string): boolean {
  return MY_MOBILE.test(normalizeMyMobile(raw));
}

/**
 * Works out whether free text typed into the recipient search is a payable
 * identifier. Mobile wins over account when both patterns match, because DuitNow
 * mobile is the more common way to pay individuals.
 */
export function classifyIdentifier(raw: string): { channel: RecipientChannel; value: string } | null {
  const trimmed = raw.trim();
  if (!/^[+\d][\d\s-]*$/.test(trimmed)) return null;
  const mobile = normalizeMyMobile(trimmed);
  if (MY_MOBILE.test(mobile)) return { channel: 'mobile', value: mobile };
  const digits = trimmed.replace(/\D/g, '');
  if (ACCOUNT_NUMBER.test(digits)) return { channel: 'account', value: digits };
  return null;
}

/** "0123456789" -> "012-345 6789", "01123456789" -> "011-2345 6789", accounts in groups of 4. */
export function formatIdentifier(channel: RecipientChannel, value: string): string {
  if (channel === 'mobile') {
    const head = value.slice(0, 3);
    const rest = value.slice(3);
    const split = rest.length - 4;
    return `${head}-${rest.slice(0, split)} ${rest.slice(split)}`;
  }
  return value.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Shows only the last 4 digits — never render full account numbers in lists. */
export function maskIdentifier(value: string): string {
  return `•••• ${value.slice(-4)}`;
}
