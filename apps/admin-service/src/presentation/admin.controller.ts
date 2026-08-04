import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ADMIN_PATTERNS,
  type AdminPageListItem,
  CMS_PATTERNS,
  CONTACT_PATTERNS,
  type ContactSubmissionDto,
  type CreateProjectPayload,
  type GetProjectByIdPayload,
  type GetQuotationPayload,
  type ListContactsPayload,
  type ListQuotationsPayload,
  type PageDto,
  PROJECT_PATTERNS,
  type ProjectDto,
  type ProjectListPayload,
  type PublishPagePayload,
  QUOTATION_PATTERNS,
  type QuotationRequestDto,
  type RemoveProjectPayload,
  SERVICE_PATTERNS,
  type ServiceOfferingDto,
  type SetContactStatusPayload,
  type SetQuotationStatusPayload,
  type UpdatePagePayload,
  type UpdateProjectPayload,
  type UpsertServicePayload,
} from '@fardeen/types';
import { GetDashboard } from '../application/get-dashboard.use-case';
import { DOWNSTREAM, type Downstream } from '../application/ports/downstream.port';

/**
 * Admin BFF (ADR-005). Each handler either composes a read model (dashboard) or forwards to the
 * OWNING service and returns its `Result<T>` unchanged — no second database, no persistent state.
 * The gateway enforces Bearer + RBAC before any of these are reached.
 */
@Controller()
export class AdminController {
  constructor(
    @Inject(DOWNSTREAM) private readonly downstream: Downstream,
    private readonly getDashboard: GetDashboard,
  ) {}

  @MessagePattern(ADMIN_PATTERNS.dashboard)
  dashboard() {
    return this.getDashboard.execute();
  }

  // ---- Projects (list includes drafts) ----
  @MessagePattern(ADMIN_PATTERNS.projectsList)
  projectsList(@Payload() payload: ProjectListPayload) {
    return this.downstream.call('project', PROJECT_PATTERNS.list, {
      ...payload,
      includeUnpublished: true,
    });
  }

  @MessagePattern(ADMIN_PATTERNS.projectsGet)
  projectsGet(@Payload() payload: GetProjectByIdPayload) {
    return this.downstream.call<ProjectDto>('project', PROJECT_PATTERNS.getById, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.projectsCreate)
  projectsCreate(@Payload() payload: CreateProjectPayload) {
    return this.downstream.call<ProjectDto>('project', PROJECT_PATTERNS.create, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.projectsUpdate)
  projectsUpdate(@Payload() payload: UpdateProjectPayload) {
    return this.downstream.call<ProjectDto>('project', PROJECT_PATTERNS.update, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.projectsRemove)
  projectsRemove(@Payload() payload: RemoveProjectPayload) {
    return this.downstream.call<{ removed: boolean }>('project', PROJECT_PATTERNS.remove, payload);
  }

  // ---- Services (list includes inactive) ----
  @MessagePattern(ADMIN_PATTERNS.servicesList)
  servicesList() {
    return this.downstream.call<ServiceOfferingDto[]>('service', SERVICE_PATTERNS.listAll, {});
  }

  @MessagePattern(ADMIN_PATTERNS.servicesUpsert)
  servicesUpsert(@Payload() payload: UpsertServicePayload) {
    return this.downstream.call<ServiceOfferingDto>('service', SERVICE_PATTERNS.upsert, payload);
  }

  // ---- Pages (get includes drafts) ----
  @MessagePattern(ADMIN_PATTERNS.pagesList)
  pagesList() {
    return this.downstream.call<AdminPageListItem[]>('cms', CMS_PATTERNS.listPages, {});
  }

  @MessagePattern(ADMIN_PATTERNS.pagesGet)
  pagesGet(@Payload() payload: { slug: string }) {
    return this.downstream.call<PageDto>('cms', CMS_PATTERNS.getPage, {
      slug: payload.slug,
      includeUnpublished: true,
    });
  }

  @MessagePattern(ADMIN_PATTERNS.pagesUpdate)
  pagesUpdate(@Payload() payload: UpdatePagePayload) {
    return this.downstream.call<PageDto>('cms', CMS_PATTERNS.updatePage, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.pagesPublish)
  pagesPublish(@Payload() payload: PublishPagePayload) {
    return this.downstream.call<PageDto>('cms', CMS_PATTERNS.publishPage, payload);
  }

  // ---- Contacts ----
  @MessagePattern(ADMIN_PATTERNS.contactsList)
  contactsList(@Payload() payload: ListContactsPayload) {
    return this.downstream.call('contact', CONTACT_PATTERNS.list, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.contactsSetStatus)
  contactsSetStatus(@Payload() payload: SetContactStatusPayload) {
    return this.downstream.call<ContactSubmissionDto>('contact', CONTACT_PATTERNS.setStatus, payload);
  }

  // ---- Quotations ----
  @MessagePattern(ADMIN_PATTERNS.quotationsList)
  quotationsList(@Payload() payload: ListQuotationsPayload) {
    return this.downstream.call('quotation', QUOTATION_PATTERNS.list, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.quotationsGet)
  quotationsGet(@Payload() payload: GetQuotationPayload) {
    return this.downstream.call<QuotationRequestDto>('quotation', QUOTATION_PATTERNS.get, payload);
  }

  @MessagePattern(ADMIN_PATTERNS.quotationsSetStatus)
  quotationsSetStatus(@Payload() payload: SetQuotationStatusPayload) {
    return this.downstream.call<QuotationRequestDto>('quotation', QUOTATION_PATTERNS.setStatus, payload);
  }
}
