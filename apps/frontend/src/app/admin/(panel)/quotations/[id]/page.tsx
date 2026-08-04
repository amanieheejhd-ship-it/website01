import { QuotationDetail } from '../quotation-detail';

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuotationDetail id={id} />;
}
