import { loadCategories } from '../../../_lib/categories';
import { PageHeader } from '../../../_components/ui';
import { ProjectForm } from '../project-form';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const categories = await loadCategories();
  return (
    <>
      <PageHeader title="New project" description="Create a project. It appears on the public site once published." />
      <ProjectForm mode="create" categories={categories} />
    </>
  );
}
