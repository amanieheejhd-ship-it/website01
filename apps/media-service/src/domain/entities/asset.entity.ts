import type { AssetStatus, OwnerContext } from '@fardeen/types';

export interface AssetVariant {
  kind: string; // thumb | poster | webp | avif | glb-draco
  objectKey: string;
}

export interface AssetProps {
  id: string;
  bucket: string;
  objectKey: string;
  mime: string;
  size: number;
  checksum: string;
  ownerContext: OwnerContext;
  ownerId: string | null;
  variants: AssetVariant[];
  status: AssetStatus;
  createdAt: Date;
}

/** Asset aggregate (docs/DOMAIN-MODEL.md §Media). Bytes live in MinIO; this owns metadata + variants. */
export class Asset {
  private constructor(private readonly props: AssetProps) {}

  static create(props: AssetProps): Asset {
    return new Asset(props);
  }
  static rehydrate(props: AssetProps): Asset {
    return new Asset(props);
  }

  /** Mark ready once the bytes exist. Returns true only on the pending → ready transition. */
  markReady(): boolean {
    if (this.props.status === 'pending') {
      this.props.status = 'ready';
      return true;
    }
    return false;
  }

  get id(): string {
    return this.props.id;
  }
  get bucket(): string {
    return this.props.bucket;
  }
  get objectKey(): string {
    return this.props.objectKey;
  }
  get mime(): string {
    return this.props.mime;
  }
  get size(): number {
    return this.props.size;
  }
  get checksum(): string {
    return this.props.checksum;
  }
  get ownerContext(): OwnerContext {
    return this.props.ownerContext;
  }
  get ownerId(): string | null {
    return this.props.ownerId;
  }
  get variants(): AssetVariant[] {
    return this.props.variants;
  }
  get status(): AssetStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
