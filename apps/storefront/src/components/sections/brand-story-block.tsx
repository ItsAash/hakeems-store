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
    // Editorial split: oversized serif statement on the left, the narrative in a
    // comfortable reading measure offset to the right — a set piece, so it gets the
    // large section rhythm.
    <section className={`py-section-lg ${CONTAINER}`}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-span-6">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {heading && <h2 className="max-w-lg font-serif text-display-xl text-[var(--color-ink)]">{heading}</h2>}
        </div>
        <div className="flex max-w-lg flex-col gap-6 lg:col-span-5 lg:col-start-8 lg:pt-2">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.id} className="leading-relaxed text-[var(--color-ink-muted)]">
              {paragraph.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
