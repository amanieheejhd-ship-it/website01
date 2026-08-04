import { PageHeader } from '../../../_components/ui';
import { ServiceForm } from '../service-form';

export default async function EditServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <PageHeader title="Edit service" description="Update this service. Changes reflect on the public site." />
      <ServiceForm mode="edit" slug={slug} />
    </>
  );
}
