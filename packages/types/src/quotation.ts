import { z } from 'zod';

/** Quotation contracts — quotation-service owns quotation_db (docs/DOMAIN-MODEL.md §Quotation). */

export type QuotationStatus = 'requested' | 'reviewing' | 'quoted' | 'won' | 'lost';

export interface QuoteContact {
  name: string;
  email: string;
  phone: string;
}
export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}
export interface QuoteLineItemDto {
  id: string;
  label: string;
  qty: number;
  unitPrice: number; // minor units
  currency: string;
}
export interface QuotationRequestDto {
  id: string;
  contact: QuoteContact;
  serviceSlugs: string[]; // reference service-management by slug (no cross-db join)
  projectType: string;
  budgetRange: BudgetRange | null;
  timeline: string;
  details: string;
  attachments: string[]; // media reference ids
  status: QuotationStatus;
  lineItems: QuoteLineItemDto[];
  total: number;
  createdAt: string;
}

export const requestQuotationSchema = z.object({
  contact: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    phone: z.string().min(5).max(24),
  }),
  serviceSlugs: z.array(z.string()).default([]),
  projectType: z.string().max(120).default(''),
  budgetRange: z
    .object({
      min: z.coerce.number().int().nonnegative(),
      max: z.coerce.number().int().nonnegative(),
      currency: z.string().default('INR'),
    })
    .nullable()
    .optional(),
  timeline: z.string().max(120).default(''),
  details: z.string().max(4000).default(''),
  attachments: z.array(z.string()).default([]),
});
export type RequestQuotationInput = z.infer<typeof requestQuotationSchema>;

export interface RequestQuotationPayload extends RequestQuotationInput {
  idempotencyKey: string;
  correlationId?: string;
}
export interface GetQuotationPayload {
  id: string;
}
export interface ListQuotationsPayload {
  status?: QuotationStatus;
  page?: number;
  limit?: number;
}
export interface SetQuotationStatusPayload {
  id: string;
  status: QuotationStatus;
  correlationId?: string;
}

export interface QuotationRequestedData {
  quotationId: string;
  email: string;
}
export interface QuotationStatusChangedData {
  quotationId: string;
  email: string;
  from: QuotationStatus;
  to: QuotationStatus;
}

/** Admin dashboard: counts of quotation requests broken down by status. */
export interface QuotationStats {
  byStatus: Record<QuotationStatus, number>;
  total: number;
}
