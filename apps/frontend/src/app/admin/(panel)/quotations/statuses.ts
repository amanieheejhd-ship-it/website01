import type { QuotationStatus } from '@fardeen/types';

/** Quotation lifecycle order (requested→reviewing→quoted→won/lost). Lives outside page.tsx because
 *  Next.js page files may only export Next-known symbols (`next build` rejects extra exports). */
export const QUOTE_STATUSES: QuotationStatus[] = ['requested', 'reviewing', 'quoted', 'won', 'lost'];
