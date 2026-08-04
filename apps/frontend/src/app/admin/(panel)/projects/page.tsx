import { loadCategories } from '../../_lib/categories';
import { ProjectsTable } from './projects-table';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const categories = await loadCategories();
  return <ProjectsTable categories={categories} />;
}
