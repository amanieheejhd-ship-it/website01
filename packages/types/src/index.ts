/**
 * @fardeen/types — the single source of truth for every cross-boundary shape.
 *
 * Imported by the gateway, every microservice, and the frontend alike. A change to
 * any contract here is a compile error on both the producer and consumer side — no
 * silent drift (docs/ARCHITECTURE.md ADR-007, docs/API-CONTRACTS.md §3).
 */
export * from './envelope';
export * from './contracts';
export * from './events';
export * from './auth';
export * from './catalog';
export * from './projects';
export * from './cms';
export * from './contact';
export * from './quotation';
export * from './media';
export * from './admin';
