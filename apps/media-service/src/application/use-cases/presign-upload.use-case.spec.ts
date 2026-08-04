import { DomainError } from '@fardeen/shared';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { MediaStore } from '../ports/media-store.port';
import { PresignUpload } from './presign-upload.use-case';

jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(() => 'fixed-uuid-1234'),
}));

const makeMocks = () => {
  const repo: jest.Mocked<AssetRepository> = {
    findById: jest.fn(),
    findManyByIds: jest.fn(),
    save: jest.fn(),
  };
  const store: jest.Mocked<MediaStore> = {
    bucket: 'media',
    presignPut: jest.fn(),
    presignGet: jest.fn(),
    exists: jest.fn(),
  };
  return { repo, store };
};

describe('PresignUpload', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a pending asset, presigns a PUT url and returns the result envelope', async () => {
    const { repo, store } = makeMocks();
    store.presignPut.mockResolvedValue('https://minio/put-url');

    const res = await new PresignUpload(repo, store).execute({
      filename: 'my file!.png',
      mime: 'image/png',
      ownerContext: 'cms',
      ownerId: 'owner-7',
    });

    const expectedKey = 'cms/fixed-uuid-1234/my_file_.png';
    // MediaStore port is used to presign the upload URL.
    expect(store.presignPut).toHaveBeenCalledTimes(1);
    expect(store.presignPut).toHaveBeenCalledWith(expectedKey);

    // A pending Asset is persisted before presigning.
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.id).toBe('fixed-uuid-1234');
    expect(saved.status).toBe('pending');
    expect(saved.bucket).toBe('media');
    expect(saved.objectKey).toBe(expectedKey);
    expect(saved.ownerId).toBe('owner-7');
    expect(saved.createdAt).toEqual(new Date('2026-08-04T00:00:00.000Z'));

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        assetId: 'fixed-uuid-1234',
        bucket: 'media',
        objectKey: expectedKey,
        url: 'https://minio/put-url',
        fields: {},
      });
    }
  });

  it('defaults ownerId to null when omitted', async () => {
    const { repo, store } = makeMocks();
    store.presignPut.mockResolvedValue('url');

    await new PresignUpload(repo, store).execute({
      filename: 'a.png',
      mime: 'image/png',
      ownerContext: 'project',
    });

    expect(repo.save.mock.calls[0][0].ownerId).toBeNull();
  });

  it('maps a thrown DomainError from the store to the Result error envelope', async () => {
    const { repo, store } = makeMocks();
    store.presignPut.mockRejectedValue(new DomainError('STORE_DOWN', 'nope'));

    const res = await new PresignUpload(repo, store).execute({
      filename: 'a.png',
      mime: 'image/png',
      ownerContext: 'cms',
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('STORE_DOWN');
  });
});
