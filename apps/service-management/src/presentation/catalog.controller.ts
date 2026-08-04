import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  SERVICE_PATTERNS,
  type GetServiceBySlugPayload,
  type UpsertServicePayload,
} from '@fardeen/types';
import { GetServiceBySlug } from '../application/use-cases/get-service-by-slug.use-case';
import { ListAllServices } from '../application/use-cases/list-all-services.use-case';
import { ListServices } from '../application/use-cases/list-services.use-case';
import { UpsertService } from '../application/use-cases/upsert-service.use-case';

@Controller()
export class CatalogController {
  constructor(
    private readonly listServices: ListServices,
    private readonly listAllServices: ListAllServices,
    private readonly getServiceBySlug: GetServiceBySlug,
    private readonly upsertService: UpsertService,
  ) {}

  @MessagePattern(SERVICE_PATTERNS.list)
  list() {
    return this.listServices.execute();
  }

  @MessagePattern(SERVICE_PATTERNS.listAll)
  listAll() {
    return this.listAllServices.execute();
  }

  @MessagePattern(SERVICE_PATTERNS.getBySlug)
  getBySlug(@Payload() payload: GetServiceBySlugPayload) {
    return this.getServiceBySlug.execute(payload);
  }

  @MessagePattern(SERVICE_PATTERNS.upsert)
  upsert(@Payload() payload: UpsertServicePayload) {
    return this.upsertService.execute(payload);
  }
}
