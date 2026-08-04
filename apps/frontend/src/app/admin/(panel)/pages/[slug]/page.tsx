import { PageHeader } from '../../../_components/ui';
import { PageEditor } from '../page-editor';

export default async function EditPagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <PageHeader title="Edit page" description="Update content and SEO, then publish to the public site." />
      <PageEditor slug={slug} />
    </>
  );
}
