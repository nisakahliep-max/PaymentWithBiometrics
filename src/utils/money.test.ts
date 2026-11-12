import { centsFromDigits, formatAmount, formatMoney, parseAmount } from './money';

describe('formatMoney', () => {
  it('formats sen as Ringgit with thousands separators', () => {
    expect(formatMoney(0)).toBe('RM 0.00');
    expect(formatMoney(5)).toBe('RM 0.05');
    expect(formatMoney(123456)).toBe('RM 1,234.56');
    expect(formatMoney(100000000)).toBe('RM 1,000,000.00');
  });

  it('handles negatives and explicit signs', () => {
    expect(formatMoney(-2500)).toBe('−RM 25.00');
    expect(formatMoney(-2500, { signed: true })).toBe('−RM 25.00');
    expect(formatMoney(2500, { signed: true })).toBe('+RM 25.00');
  });

  it('never prints NaN', () => {
    expect(formatMoney(Number.NaN)).toBe('RM 0.00');
  });

  it('formatAmount omits the symbol', () => {
    expect(formatAmount(123456)).toBe('1,234.56');
  });
});

describe('centsFromDigits', () => {
  it('shifts digits in from the right (cash-register entry)', () => {
    expect(centsFromDigits('')).toBe(0);
    expect(centsFromDigits('1')).toBe(1);
    expect(centsFromDigits('125')).toBe(125);
    expect(centsFromDigits('RM 1,234.56')).toBe(123456);
  });

  it('ignores leading zeros and caps length', () => {
    expect(centsFromDigits('000125')).toBe(125);
    expect(centsFromDigits('12345678901234')).toBe(123456789);
  });
});

describe('parseAmount', () => {
  it('parses decimal strings without floating point error', () => {
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('0.29')).toBe(29); // 0.29 * 100 = 28.999999999999996 with floats
    expect(parseAmount('1,234.5')).toBe(123450);
    expect(parseAmount('RM 20')).toBe(2000);
  });

  it('rejects invalid input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('1.234')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1..2')).toBeNull();
  });
});
