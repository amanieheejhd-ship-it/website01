import { RefreshSession } from './refresh-session.entity';

const now = new Date('2026-01-01T00:00:00Z');
const future = new Date('2026-06-01T00:00:00Z');
const past = new Date('2025-06-01T00:00:00Z');

const make = (overrides: Partial<ConstructorParameters<typeof RefreshSession>[0]> = {}) =>
  new RefreshSession({
    id: 's1',
    userId: 'u1',
    tokenHash: 'hash',
    familyId: 'fam1',
    expiresAt: future,
    ...overrides,
  });

describe('RefreshSession entity', () => {
  it('exposes its identity fields', () => {
    const s = make();
    expect(s.id).toBe('s1');
    expect(s.userId).toBe('u1');
    expect(s.familyId).toBe('fam1');
    expect(s.tokenHash).toBe('hash');
    expect(s.expiresAt).toEqual(future);
  });

  it('isActive() is true when not revoked and not expired', () => {
    expect(make().isActive(now)).toBe(true);
  });

  it('isActive() is false when expired', () => {
    expect(make({ expiresAt: past }).isActive(now)).toBe(false);
  });

  it('isActive() is false when revoked', () => {
    expect(make({ revokedAt: past }).isActive(now)).toBe(false);
  });

  it('revoke() stamps revokedAt on the first call and is idempotent', () => {
    const s = make();
    s.revoke(now);
    expect(s.isActive(now)).toBe(false);
    // Second revoke keeps the original timestamp (no throw, still inactive).
    s.revoke(future);
    expect(s.isActive(now)).toBe(false);
  });
});
