import { classifyIdentifier, formatIdentifier, isValidMyMobile, maskIdentifier, normalizeMyMobile } from './identifiers';

describe('identifiers', () => {
  it('normalises Malaysian mobile numbers', () => {
    expect(normalizeMyMobile('+60 12-345 6789')).toBe('0123456789');
    expect(normalizeMyMobile('6011 2345 6789')).toBe('01123456789');
    expect(normalizeMyMobile('012-3456789')).toBe('0123456789');
  });

  it('validates mobile numbers', () => {
    expect(isValidMyMobile('012-345 6789')).toBe(true);
    expect(isValidMyMobile('011-2345 6789')).toBe(true);
    expect(isValidMyMobile('03-1234 5678')).toBe(false);
  });

  it('classifies free text as mobile, account or nothing', () => {
    expect(classifyIdentifier('+60123456789')).toEqual({ channel: 'mobile', value: '0123456789' });
    expect(classifyIdentifier('5123 4567 8901')).toEqual({ channel: 'account', value: '512345678901' });
    expect(classifyIdentifier('Aisyah')).toBeNull();
    expect(classifyIdentifier('12345')).toBeNull();
  });

  it('masks all but the last four digits', () => {
    expect(maskIdentifier('512345678901')).toBe('•••• 8901');
  });
});

describe('formatIdentifier', () => {
  it('formats mobiles and account numbers for display', () => {
    expect(formatIdentifier('mobile', '0123456789')).toBe('012-345 6789');
    expect(formatIdentifier('mobile', '01123456789')).toBe('011-2345 6789');
    expect(formatIdentifier('account', '512345678901')).toBe('5123 4567 8901');
  });
});
