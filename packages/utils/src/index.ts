/**
 * @fardeen/utils — framework-agnostic pure helpers. No React, Nest, Prisma, or Node-only
 * imports may enter this leaf package (docs/ARCHITECTURE.md §4). Import it from anywhere.
 */

/** URL-safe slug from an arbitrary title. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Narrowing guard that removes `null` / `undefined` from a type. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Exhaustiveness helper — makes a missing `switch` case a compile error. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Format a paise/rupee amount as INR currency. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
