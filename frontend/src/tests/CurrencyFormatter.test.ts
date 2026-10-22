import { describe, it, expect } from 'vitest';
import { formatINR, formatPct, getPnLColor, getPnLBg } from '../utils/currency';

describe('Currency and Financial Formatters', () => {
  it('formats exactly INR 100.00 initial capital properly', () => {
    expect(formatINR(100)).toBe('₹100.00');
    expect(formatINR(100.00)).toBe('₹100.00');
  });

  it('formats zero and negative numbers properly', () => {
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(-5.25)).toBe('-₹5.25');
  });

  it('formats Indian numbering system commas properly', () => {
    expect(formatINR(1234.56)).toBe('₹1,234.56');
    expect(formatINR(100000)).toBe('₹1,00,000.00');
  });

  it('formats percentages with signs', () => {
    expect(formatPct(2.5)).toBe('+2.50%');
    expect(formatPct(-1.8)).toBe('-1.80%');
    expect(formatPct(0)).toBe('0.00%');
  });

  it('returns appropriate color styles for positive, negative, and zero PnL', () => {
    expect(getPnLColor(10)).toContain('emerald');
    expect(getPnLColor(-10)).toContain('rose');
    expect(getPnLColor(0)).toContain('slate');
  });
});
