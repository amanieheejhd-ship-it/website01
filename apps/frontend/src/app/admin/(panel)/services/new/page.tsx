import { PageHeader } from '../../../_components/ui';
import { ServiceForm } from '../service-form';

export default function NewServicePage() {
  return (
    <>
      <PageHeader title="New service" description="Create a service offering. It appears on the public site while active." />
      <ServiceForm mode="create" />
    </>
  );
}
