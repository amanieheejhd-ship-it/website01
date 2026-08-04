import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CMS_PATTERNS,
  type GetPagePayload,
  type ListTestimonialsPayload,
  type PublishPagePayload,
  type UpdatePagePayload,
} from '@fardeen/types';
import { GetPage } from '../application/use-cases/get-page.use-case';
import { ListPages } from '../application/use-cases/list-pages.use-case';
import { ListTestimonials } from '../application/use-cases/list-testimonials.use-case';
import { PublishPage } from '../application/use-cases/publish-page.use-case';
import { UpdatePage } from '../application/use-cases/update-page.use-case';

@Controller()
export class ContentController {
  constructor(
    private readonly getPage: GetPage,
    private readonly listPages: ListPages,
    private readonly updatePage: UpdatePage,
    private readonly listTestimonials: ListTestimonials,
    private readonly publishPage: PublishPage,
  ) {}

  @MessagePattern(CMS_PATTERNS.listPages)
  pages() {
    return this.listPages.execute();
  }

  @MessagePattern(CMS_PATTERNS.updatePage)
  update(@Payload() payload: UpdatePagePayload) {
    return this.updatePage.execute(payload);
  }

  @MessagePattern(CMS_PATTERNS.getPage)
  page(@Payload() payload: GetPagePayload) {
    return this.getPage.execute(payload);
  }

  @MessagePattern(CMS_PATTERNS.listTestimonials)
  testimonials(@Payload() payload: ListTestimonialsPayload) {
    return this.listTestimonials.execute(payload);
  }

  @MessagePattern(CMS_PATTERNS.publishPage)
  publish(@Payload() payload: PublishPagePayload) {
    return this.publishPage.execute(payload);
  }
}
