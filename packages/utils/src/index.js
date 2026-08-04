"use strict";
/**
 * @fardeen/utils — framework-agnostic pure helpers. No React, Nest, Prisma, or Node-only
 * imports may enter this leaf package (docs/ARCHITECTURE.md §4). Import it from anywhere.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.isDefined = isDefined;
exports.assertNever = assertNever;
exports.clamp = clamp;
exports.formatINR = formatINR;
/** URL-safe slug from an arbitrary title. */
function slugify(input) {
    return input
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/** Narrowing guard that removes `null` / `undefined` from a type. */
function isDefined(value) {
    return value !== null && value !== undefined;
}
/** Exhaustiveness helper — makes a missing `switch` case a compile error. */
function assertNever(value) {
    throw new Error(`Unexpected value: ${String(value)}`);
}
/** Clamp a number into an inclusive range. */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
/** Format a paise/rupee amount as INR currency. */
function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
//# sourceMappingURL=index.js.map