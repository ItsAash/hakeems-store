import { CONTAINER } from '@/lib/ui';
import type { SectionOf } from '@/lib/strapi/types';
import { Accordion } from '@/components/ui/accordion';
import { Markdown } from '@/components/legal/markdown';
import { SectionHeaderBlock } from '@/components/sections/section-header-block';

/**
 * `section.faq` — Strapi-authored question/answer pairs rendered through the shared
 * Accordion primitive (ARIA disclosure pattern). Answers are Markdown, so editors can
 * link out to legal pages or size guides.
 */
export function FaqBlock({ section }: { section: SectionOf<'section.faq'> }) {
  if (section.items.length === 0) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <SectionHeaderBlock header={section.header} />
        <Accordion
          items={section.items.map((item) => ({
            id: String(item.id),
            label: item.question,
            content: <Markdown content={item.answer} />,
          }))}
        />
      </div>
    </section>
  );
}
