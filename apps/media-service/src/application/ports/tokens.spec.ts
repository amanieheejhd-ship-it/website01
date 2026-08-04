import { ASSET_REPOSITORY } from '../../domain/repositories/asset.repository';
import { EVENT_PUBLISHER } from './event-publisher.port';
import { MEDIA_STORE } from './media-store.port';

describe('DI tokens', () => {
  it('exposes unique injection symbols', () => {
    const tokens = [ASSET_REPOSITORY, EVENT_PUBLISHER, MEDIA_STORE];
    tokens.forEach((t) => expect(typeof t).toBe('symbol'));
    expect(new Set(tokens).size).toBe(3);
    expect(ASSET_REPOSITORY.toString()).toBe('Symbol(ASSET_REPOSITORY)');
    expect(EVENT_PUBLISHER.toString()).toBe('Symbol(EVENT_PUBLISHER)');
    expect(MEDIA_STORE.toString()).toBe('Symbol(MEDIA_STORE)');
  });
});
