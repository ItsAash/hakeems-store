import { CONTAINER } from '@/lib/ui';
import type { SectionOf } from '@/lib/strapi/types';
import { Markdown } from '@/components/legal/markdown';
import { SectionHeaderBlock } from '@/components/sections/section-header-block';

/**
 * `section.prose` — free-form Markdown rendered in the site's long-form typography
 * (same renderer as legal pages). The escape hatch for editorial copy that doesn't
 * fit a structured section, constrained to a readable measure.
 */
export function ProseBlock({ section }: { section: SectionOf<'section.prose'> }) {
  if (!section.content.trim()) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <div className="flex max-w-2xl flex-col gap-8">
        <SectionHeaderBlock header={section.header} />
        <div>
          <Markdown content={section.content} />
        </div>
      </div>
    </section>
  );
}
