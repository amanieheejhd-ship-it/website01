import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MEDIA_PATTERNS,
  type GetAssetPayload,
  type PresignUploadPayload,
  type ResolveManyPayload,
} from '@fardeen/types';
import { GetAsset } from '../application/use-cases/get-asset.use-case';
import { PresignUpload } from '../application/use-cases/presign-upload.use-case';
import { ResolveMany } from '../application/use-cases/resolve-many.use-case';

@Controller()
export class MediaController {
  constructor(
    private readonly presignUpload: PresignUpload,
    private readonly getAsset: GetAsset,
    private readonly resolveMany: ResolveMany,
  ) {}

  @MessagePattern(MEDIA_PATTERNS.presignUpload)
  presign(@Payload() payload: PresignUploadPayload) {
    return this.presignUpload.execute(payload);
  }

  @MessagePattern(MEDIA_PATTERNS.get)
  get(@Payload() payload: GetAssetPayload) {
    return this.getAsset.execute(payload);
  }

  @MessagePattern(MEDIA_PATTERNS.resolveMany)
  resolve(@Payload() payload: ResolveManyPayload) {
    return this.resolveMany.execute(payload);
  }
}
