import { Injectable } from '@nestjs/common';
import type { AssetStatus, OwnerContext } from '@fardeen/types';
import { Asset, type AssetVariant } from '../../domain/entities/asset.entity';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { Prisma } from '../../../generated/client';
import { PrismaService } from './prisma.service';

interface AssetRow {
  id: string;
  bucket: string;
  objectKey: string;
  mime: string;
  size: number;
  checksum: string;
  ownerContext: string;
  ownerId: string | null;
  variants: unknown;
  status: string;
  createdAt: Date;
}

@Injectable()
export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Asset | null> {
    const r = await this.prisma.asset.findUnique({ where: { id } });
    return r ? this.toDomain(r as AssetRow) : null;
  }

  async findManyByIds(ids: string[]): Promise<Asset[]> {
    const rows = await this.prisma.asset.findMany({ where: { id: { in: ids } } });
    return rows.map((r: AssetRow) => this.toDomain(r));
  }

  async save(a: Asset): Promise<void> {
    const data = {
      bucket: a.bucket,
      objectKey: a.objectKey,
      mime: a.mime,
      size: a.size,
      checksum: a.checksum,
      ownerContext: a.ownerContext,
      ownerId: a.ownerId,
      variants: a.variants as unknown as Prisma.InputJsonValue,
      status: a.status,
    };
    await this.prisma.asset.upsert({
      where: { id: a.id },
      create: { id: a.id, ...data, createdAt: a.createdAt },
      update: { status: a.status, size: a.size, checksum: a.checksum },
    });
  }

  private toDomain(r: AssetRow): Asset {
    return Asset.rehydrate({
      id: r.id,
      bucket: r.bucket,
      objectKey: r.objectKey,
      mime: r.mime,
      size: r.size,
      checksum: r.checksum,
      ownerContext: r.ownerContext as OwnerContext,
      ownerId: r.ownerId,
      variants: (r.variants as AssetVariant[]) ?? [],
      status: r.status as AssetStatus,
      createdAt: r.createdAt,
    });
  }
}
