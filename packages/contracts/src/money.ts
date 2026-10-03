import { z } from 'zod';

/**
 * Money is always an integer number of minor units (cents, paisa, …) — never a float (PLAN §8.8).
 * Intermediate products use BigInt; results are converted back with a safe-integer check.
 */
export type MinorUnits = number & { readonly __brand: 'MinorUnits' };

/** Non-negative amount, e.g. a price or a total. */
export const moneyAmountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
/** Signed amount, e.g. an adjustment delta. */
export const signedMoneyAmountSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

export function minor(value: number): MinorUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Money must be a safe integer of minor units, got ${value}`);
  }
  return value as MinorUnits;
}

function fromBigInt(value: bigint): MinorUnits {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Money overflow: ${value}`);
  }
  return Number(value) as MinorUnits;
}

/** Integer division rounding half away from zero ("half-up" for positive amounts). */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Denominator must be positive');
  const negative = numerator < 0n;
  const abs = negative ? -numerator : numerator;
  const quotient = abs / denominator;
  const rounded = (abs % denominator) * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function addMoney(...amounts: MinorUnits[]): MinorUnits {
  return fromBigInt(amounts.reduce((sum, amount) => sum + BigInt(amount), 0n));
}

export function subtractMoney(a: MinorUnits, b: MinorUnits): MinorUnits {
  return fromBigInt(BigInt(a) - BigInt(b));
}

export function multiplyMoney(amount: MinorUnits, quantity: number): MinorUnits {
  if (!Number.isSafeInteger(quantity)) throw new RangeError('Quantity must be an integer');
  return fromBigInt(BigInt(amount) * BigInt(quantity));
}

/** Percentage given in basis points (10% = 1000), rounded half-up (PLAN §19.2). */
export function percentOfBps(amount: MinorUnits, bps: number): MinorUnits {
  if (!Number.isSafeInteger(bps) || bps < 0)
    throw new RangeError('bps must be a non-negative integer');
  return fromBigInt(divRoundHalfUp(BigInt(amount) * BigInt(bps), 10_000n));
}

/** Rate given in parts per million (8.875% = 88_750), rounded half-up (PLAN §13.4). */
export function applyRatePpm(amount: MinorUnits, ppm: number): MinorUnits {
  if (!Number.isSafeInteger(ppm) || ppm < 0)
    throw new RangeError('ppm must be a non-negative integer');
  return fromBigInt(divRoundHalfUp(BigInt(amount) * BigInt(ppm), 1_000_000n));
}

/**
 * Splits `total` across `weights` proportionally with the largest-remainder method.
 * The parts always sum exactly to `total`; ties go to the earlier index (PLAN §13.4).
 */
export function allocate(total: MinorUnits, weights: readonly number[]): MinorUnits[] {
  if (total < 0) throw new RangeError('Cannot allocate a negative amount');
  if (weights.length === 0) throw new RangeError('Cannot allocate over zero weights');
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
    throw new RangeError('Weights must be non-negative integers');
  }
  const weightSum = weights.reduce((sum, w) => sum + BigInt(w), 0n);
  if (weightSum === 0n) {
    if (total === 0) return weights.map(() => minor(0));
    throw new RangeError('Cannot allocate a non-zero amount over zero total weight');
  }

  const totalBig = BigInt(total);
  const shares = weights.map((w, index) => {
    const exact = totalBig * BigInt(w);
    return { index, floor: exact / weightSum, remainder: exact % weightSum };
  });
  let leftover = totalBig - shares.reduce((sum, s) => sum + s.floor, 0n);
  const byRemainder = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const share of byRemainder) {
    if (leftover === 0n) break;
    share.floor += 1n;
    leftover -= 1n;
  }
  return shares.map((s) => fromBigInt(s.floor));
}

/** Integer minor units → exact decimal string ("2590", 2 → "25.90"). */
export function toDecimalString(amount: MinorUnits, exponent: number): string {
  const negative = amount < 0;
  const digits = Math.abs(amount)
    .toString()
    .padStart(exponent + 1, '0');
  const whole = exponent === 0 ? digits : digits.slice(0, -exponent);
  const fraction = exponent === 0 ? '' : `.${digits.slice(-exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

/** Parses a staff-typed price ("25.9", "25.90") into minor units without touching floats. */
export function parseMoneyInput(input: string, exponent: number): MinorUnits {
  const match = /^(\d{1,15})(?:\.(\d+))?$/.exec(input.trim());
  if (!match) throw new RangeError(`Invalid amount: "${input}"`);
  const whole = match[1] ?? '0';
  const fraction = match[2] ?? '';
  if (fraction.length > exponent) {
    throw new RangeError(`Amount "${input}" has more than ${exponent} decimal places`);
  }
  return fromBigInt(BigInt(whole + fraction.padEnd(exponent, '0')));
}

export function formatMoney(
  amount: MinorUnits,
  options: { currency: string; exponent: number; locale?: string },
): string {
  const formatter = new Intl.NumberFormat(options.locale ?? 'en-US', {
    style: 'currency',
    currency: options.currency,
    minimumFractionDigits: options.exponent,
    maximumFractionDigits: options.exponent,
  });
  // Intl formats decimal strings exactly, so no float conversion is involved.
  return formatter.format(toDecimalString(amount, options.exponent) as `${number}`);
}
