/**
 * @fardeen/shared — the backend kernel imported by the gateway and every microservice
 * (docs/ARCHITECTURE.md §4). Phase 4 grows this into the global exception filter, logging
 * interceptor, correlation-id middleware, and Prisma/Redis/MinIO provider factories.
 *
 * Allowed dependencies: @fardeen/types, @fardeen/utils, @fardeen/config only.
 */
export * from './errors/domain-error';
export * from './ports/event-publisher.port';
export * from './config/correlation';
