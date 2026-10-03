import { describe, expect, it } from 'vitest';
import {
  addMoney,
  allocate,
  applyRatePpm,
  divRoundHalfUp,
  formatMoney,
  minor,
  multiplyMoney,
  parseMoneyInput,
  percentOfBps,
  subtractMoney,
  toDecimalString,
} from './money';

const m = minor;

describe('divRoundHalfUp', () => {
  it.each([
    [5n, 2n, 3n],
    [4n, 2n, 2n],
    [7n, 3n, 2n],
    [-5n, 2n, -3n],
    [1n, 3n, 0n],
    [2n, 3n, 1n],
  ])('%s / %s = %s', (n, d, expected) => {
    expect(divRoundHalfUp(n, d)).toBe(expected);
  });

  it('rejects non-positive denominators', () => {
    expect(() => divRoundHalfUp(1n, 0n)).toThrow(RangeError);
  });
});

describe('arithmetic', () => {
  it('adds, subtracts and multiplies exactly', () => {
    expect(addMoney(m(10), m(20), m(30))).toBe(60);
    expect(subtractMoney(m(10), m(25))).toBe(-15);
    expect(multiplyMoney(m(2500), 3)).toBe(7500);
  });

  it('rejects non-integer inputs and overflow', () => {
    expect(() => minor(1.5)).toThrow(RangeError);
    expect(() => multiplyMoney(m(Number.MAX_SAFE_INTEGER), 2)).toThrow(RangeError);
  });
});

describe('rates', () => {
  it('computes basis-point percentages with half-up rounding', () => {
    expect(percentOfBps(m(2500), 1000)).toBe(250); // 10%
    expect(percentOfBps(m(1999), 1500)).toBe(300); // 299.85 → 300
    expect(percentOfBps(m(5), 1000)).toBe(1); // 0.5 → 1
  });

  it('computes ppm tax rates that basis points cannot express', () => {
    expect(applyRatePpm(m(10_000), 88_750)).toBe(888); // 8.875% of 100.00 = 8.875 → 8.88
    expect(applyRatePpm(m(1999), 200_000)).toBe(400); // 20% of 19.99 = 3.998 → 4.00
  });
});

describe('allocate (largest remainder)', () => {
  it('always sums exactly to the total', () => {
    const parts = allocate(m(100), [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('is proportional to weights', () => {
    expect(allocate(m(1000), [2500, 7500])).toEqual([250, 750]);
  });

  it('gives leftover units to the largest remainders, ties to the earlier index', () => {
    expect(allocate(m(10), [1, 2, 3])).toEqual([2, 3, 5]); // exact 1.67, 3.33, 5.00
    expect(allocate(m(1), [1, 1])).toEqual([1, 0]);
  });

  it('handles zero totals and rejects impossible allocations', () => {
    expect(allocate(m(0), [0, 0])).toEqual([0, 0]);
    expect(() => allocate(m(5), [0, 0])).toThrow(RangeError);
    expect(() => allocate(m(-1), [1])).toThrow(RangeError);
    expect(() => allocate(m(1), [])).toThrow(RangeError);
  });

  it('matches the total for many random inputs', () => {
    for (let run = 0; run < 500; run++) {
      const total = m(Math.floor(Math.random() * 1_000_000));
      const weights = Array.from({ length: 1 + (run % 7) }, () =>
        Math.floor(Math.random() * 50_000),
      );
      if (!weights.some((w) => w > 0)) weights[0] = 1;
      const parts = allocate(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => p >= 0)).toBe(true);
    }
  });
});

describe('parsing and formatting', () => {
  it('parses staff input without floating point', () => {
    expect(parseMoneyInput('25.90', 2)).toBe(2590);
    expect(parseMoneyInput('25.9', 2)).toBe(2590);
    expect(parseMoneyInput(' 0.07 ', 2)).toBe(7);
    expect(parseMoneyInput('1200', 0)).toBe(1200);
    expect(parseMoneyInput('1.234', 3)).toBe(1234);
  });

  it.each(['', 'abc', '-1', '1.234', '1,5', '1.'])('rejects "%s" at exponent 2', (input) => {
    expect(() => parseMoneyInput(input, 2)).toThrow(RangeError);
  });

  it('renders exact decimal strings', () => {
    expect(toDecimalString(m(2590), 2)).toBe('25.90');
    expect(toDecimalString(m(5), 2)).toBe('0.05');
    expect(toDecimalString(m(-150), 2)).toBe('-1.50');
    expect(toDecimalString(m(1200), 0)).toBe('1200');
  });

  it('formats with the currency exponent', () => {
    expect(formatMoney(m(259_000), { currency: 'USD', exponent: 2 })).toBe('$2,590.00');
    expect(formatMoney(m(1200), { currency: 'JPY', exponent: 0, locale: 'en-US' })).toBe('¥1,200');
  });
});
