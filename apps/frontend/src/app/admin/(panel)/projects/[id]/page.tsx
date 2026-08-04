import { loadCategories } from '../../../_lib/categories';
import { PageHeader } from '../../../_components/ui';
import { ProjectForm } from '../project-form';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await loadCategories();
  return (
    <>
      <PageHeader title="Edit project" description="Update this project. Changes reflect on the public site." />
      <ProjectForm mode="edit" projectId={id} categories={categories} />
    </>
  );
}
