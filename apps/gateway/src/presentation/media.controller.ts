import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  MEDIA_PATTERNS,
  type MediaRefResolved,
  presignUploadSchema,
  type PresignUploadResult,
  SERVICE_CLIENTS,
} from '@fardeen/types';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { ZodBody } from '../common/zod-body.pipe';

@Controller('media')
export class MediaGatewayController {
  constructor(@Inject(SERVICE_CLIENTS.media) private readonly client: ClientProxy) {}

  /** Editor+: get a presigned PUT url — the client uploads bytes DIRECTLY to MinIO (bypasses gateway). */
  @Post('presign-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('editor', 'admin')
  presign(
    @Body(new ZodBody(presignUploadSchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<PresignUploadResult> {
    return callService<PresignUploadResult>(this.client, MEDIA_PATTERNS.presignUpload, {
      ...body,
      correlationId: req.correlationId,
    });
  }

  /** Public: resolve an asset id → presigned GET url + status + variants. */
  @Get(':id')
  getById(@Param('id') id: string): Promise<MediaRefResolved> {
    return callService<MediaRefResolved>(this.client, MEDIA_PATTERNS.get, { id });
  }
}
