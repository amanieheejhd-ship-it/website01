/** Renders a schema.org JSON-LD block. Server component (no interactivity). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe inside a <script type="application/ld+json"> block.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
