import { CONTAINER } from '@/lib/ui';
import type { SectionOf } from '@/lib/strapi/types';
import { getBrandStory } from '@/lib/strapi/queries';

/**
 * `section.brand-story` (Phase 4 base+override). Renders the **global** shared brand story by
 * default — authored once and consistent across every channel — so editing it in one place
 * updates all channels. A block may set its own eyebrow/heading/paragraphs to **override**
 * the shared story for that page/channel only. Left-aligned prose; renders nothing if empty.
 */
export async function BrandStoryBlock({ section }: { section: SectionOf<'section.brand-story'> }) {
  const shared = await getBrandStory();

  // Field-level override: block value wins, otherwise the shared global brand story.
  const eyebrow = section.header?.eyebrow ?? shared?.eyebrow ?? null;
  const heading = section.header?.heading ?? shared?.heading ?? null;
  const paragraphs = section.paragraphs.length > 0 ? section.paragraphs : (shared?.paragraphs ?? []);

  if (!heading && paragraphs.length === 0) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <div className="flex max-w-xl flex-col gap-6">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {heading && <h2 className="font-serif text-4xl text-[var(--color-ink)]">{heading}</h2>}
        {paragraphs.map((paragraph) => (
          <p key={paragraph.id} className="text-[var(--color-ink-muted)]">
            {paragraph.text}
          </p>
        ))}
      </div>
    </section>
  );
}
