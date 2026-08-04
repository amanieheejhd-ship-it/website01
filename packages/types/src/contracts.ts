/**
 * Internal TCP message patterns, namespaced `<context>.<action>`.
 * The gateway calls `client.send(PATTERN, payload)`; the owning service handles it with
 * `@MessagePattern(PATTERN)`. Never inline these string literals (docs/API-CONTRACTS.md §2).
 */

export const AUTH_PATTERNS = {
  register: 'auth.register',
  login: 'auth.login',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  validate: 'auth.validate',
  me: 'auth.me',
} as const;

export const CMS_PATTERNS = {
  getPage: 'cms.getPage',
  listTestimonials: 'cms.listTestimonials',
  publishPage: 'cms.publishPage',
  listPages: 'cms.listPages', // admin: all pages incl drafts
  updatePage: 'cms.updatePage', // admin: replace page content
} as const;

export const SERVICE_PATTERNS = {
  list: 'service.list',
  getBySlug: 'service.getBySlug',
  upsert: 'service.upsert',
  listAll: 'service.listAll', // admin: incl inactive
} as const;

export const PROJECT_PATTERNS = {
  list: 'project.list',
  getBySlug: 'project.getBySlug',
  getById: 'project.getById', // admin single-read by id
  listCategories: 'project.listCategories',
  create: 'project.create',
  update: 'project.update',
  remove: 'project.remove',
} as const;

export const CONTACT_PATTERNS = {
  submit: 'contact.submit',
  list: 'contact.list',
  setStatus: 'contact.setStatus',
} as const;

export const QUOTATION_PATTERNS = {
  request: 'quotation.request',
  get: 'quotation.get',
  list: 'quotation.list',
  setStatus: 'quotation.setStatus',
  stats: 'quotation.stats', // admin dashboard: counts by status
} as const;

export const MEDIA_PATTERNS = {
  presignUpload: 'media.presignUpload',
  get: 'media.get',
  resolveMany: 'media.resolveMany',
} as const;

/**
 * Admin BFF patterns (admin-service, ADR-005). The gateway's /admin routes call these; the
 * admin-service composes read models (dashboard) and forwards commands to the owning service —
 * it holds no persistent state.
 */
export const ADMIN_PATTERNS = {
  dashboard: 'admin.dashboard',
  projectsList: 'admin.projects.list',
  projectsGet: 'admin.projects.get',
  projectsCreate: 'admin.projects.create',
  projectsUpdate: 'admin.projects.update',
  projectsRemove: 'admin.projects.remove',
  servicesList: 'admin.services.list',
  servicesUpsert: 'admin.services.upsert',
  pagesList: 'admin.pages.list',
  pagesGet: 'admin.pages.get',
  pagesUpdate: 'admin.pages.update',
  pagesPublish: 'admin.pages.publish',
  contactsList: 'admin.contacts.list',
  contactsSetStatus: 'admin.contacts.setStatus',
  quotationsList: 'admin.quotations.list',
  quotationsGet: 'admin.quotations.get',
  quotationsSetStatus: 'admin.quotations.setStatus',
} as const;

/** Injection tokens for each service's ClientProxy (registered in the gateway module). */
export const SERVICE_CLIENTS = {
  auth: 'AUTH_CLIENT',
  cms: 'CMS_CLIENT',
  project: 'PROJECT_CLIENT',
  service: 'SERVICE_CLIENT',
  contact: 'CONTACT_CLIENT',
  quotation: 'QUOTATION_CLIENT',
  media: 'MEDIA_CLIENT',
  admin: 'ADMIN_CLIENT',
} as const;
