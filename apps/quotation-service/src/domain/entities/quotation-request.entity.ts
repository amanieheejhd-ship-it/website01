import { ValidationError } from '@fardeen/shared';
import type { QuotationStatus } from '@fardeen/types';
import type { BudgetRange } from '../value-objects/budget-range.vo';
import type { Money } from '../value-objects/money.vo';
import type { QuoteContact } from '../value-objects/quote-contact.vo';

export interface QuoteLineItem {
  id: string;
  label: string;
  qty: number;
  unitPrice: Money;
}

export interface QuotationRequestProps {
  id: string;
  contact: QuoteContact;
  serviceSlugs: string[];
  projectType: string;
  budgetRange: BudgetRange | null;
  timeline: string;
  details: string;
  attachments: string[];
  status: QuotationStatus;
  lineItems: QuoteLineItem[];
  idempotencyKey: string;
  createdAt: Date;
}

/** QuotationRequest aggregate (docs/DOMAIN-MODEL.md §Quotation). Status follows the defined lifecycle;
 *  total is derived from line items. serviceSlugs reference service-management (no cross-db join). */
export class QuotationRequest {
  private static readonly TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
    requested: ['reviewing', 'lost'],
    reviewing: ['quoted', 'lost'],
    quoted: ['won', 'lost'],
    won: [],
    lost: [],
  };

  private constructor(private readonly props: QuotationRequestProps) {}

  static create(props: QuotationRequestProps): QuotationRequest {
    return new QuotationRequest(props);
  }
  static rehydrate(props: QuotationRequestProps): QuotationRequest {
    return new QuotationRequest(props);
  }

  changeStatus(next: QuotationStatus): { from: QuotationStatus; to: QuotationStatus } {
    const from = this.props.status;
    if (from === next) return { from, to: next };
    if (!QuotationRequest.TRANSITIONS[from].includes(next)) {
      throw new ValidationError(`Invalid status transition: ${from} → ${next}`);
    }
    this.props.status = next;
    return { from, to: next };
  }

  get total(): number {
    return this.props.lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice.amount, 0);
  }

  get id(): string {
    return this.props.id;
  }
  get contact(): QuoteContact {
    return this.props.contact;
  }
  get serviceSlugs(): string[] {
    return this.props.serviceSlugs;
  }
  get projectType(): string {
    return this.props.projectType;
  }
  get budgetRange(): BudgetRange | null {
    return this.props.budgetRange;
  }
  get timeline(): string {
    return this.props.timeline;
  }
  get details(): string {
    return this.props.details;
  }
  get attachments(): string[] {
    return this.props.attachments;
  }
  get status(): QuotationStatus {
    return this.props.status;
  }
  get lineItems(): QuoteLineItem[] {
    return this.props.lineItems;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
