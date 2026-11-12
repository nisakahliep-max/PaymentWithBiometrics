/**
 * Money helpers.
 *
 * All amounts are stored as **integer sen (cents)**. Floating point is never used
 * for money: 0.1 + 0.2 !== 0.3 in JavaScript, which is unacceptable in a banking app.
 * We also avoid Intl.NumberFormat because its output for `en-MY` differs between
 * Hermes, JSC and Node ("RM1.00" vs "RM 1.00"), which makes UI and tests flaky.
 */
export const CURRENCY_CODE = 'MYR';
export const CURRENCY_SYMBOL = 'RM';

/** Up to RM 9,999,999.99 — well above any transfer limit, prevents overflow-y input. */
export const MAX_AMOUNT_DIGITS = 9;

function groupThousands(whole: number): string {
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 123456 -> "RM 1,234.56". `signed` adds a leading +/- (for history rows). */
export function formatMoney(cents: number, options: { signed?: boolean } = {}): string {
  if (!Number.isFinite(cents)) return `${CURRENCY_SYMBOL} 0.00`;
  const safe = Math.round(cents);
  const abs = Math.abs(safe);
  const whole = Math.floor(abs / 100);
  const fraction = (abs % 100).toString().padStart(2, '0');
  const body = `${CURRENCY_SYMBOL} ${groupThousands(whole)}.${fraction}`;
  if (options.signed) return `${safe < 0 ? '−' : '+'}${body}`;
  return safe < 0 ? `−${body}` : body;
}

/** Same as formatMoney but without the currency symbol: 123456 -> "1,234.56". */
export function formatAmount(cents: number): string {
  return formatMoney(cents).replace(`${CURRENCY_SYMBOL} `, '');
}

/**
 * "Cash register" style entry used by the amount field: every keystroke is a digit
 * that shifts in from the right, so "1", "12", "125" become 0.01, 0.12, 1.25.
 * The user never types a decimal separator, so locale keyboards (',' vs '.') and
 * malformed input like "1..2" are impossible by construction.
 */
export function centsFromDigits(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_AMOUNT_DIGITS);
  return digits.length === 0 ? 0 : parseInt(digits, 10);
}

/**
 * Parses a human-entered decimal string ("1,234.5") to cents without floats.
 * Returns null for anything that is not a valid non-negative amount with <= 2 dp.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '').replace(new RegExp(`^${CURRENCY_SYMBOL}`, 'i'), '');
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  if (whole.length > MAX_AMOUNT_DIGITS - 2) return null;
  return parseInt(whole, 10) * 100 + parseInt(fraction, 10);
}
