import { CONTAINER } from '@/lib/ui';
import type { SectionOf } from '@/lib/strapi/types';
import { resolveColorToken } from '@/lib/design/color-tokens';
import { SectionHeaderBlock } from '@/components/sections/section-header-block';

/**
 * `section.value-props` — the brand pillars strip (e.g. "Small batches · Technical
 * fabrics · Fair making"). Pure Strapi content on a token-constrained background;
 * renders nothing when the editor hasn't added items.
 */
export function ValuePropsBlock({ section }: { section: SectionOf<'section.value-props'> }) {
  if (section.items.length === 0) return null;
  const background = resolveColorToken(section.backgroundToken);

  return (
    // A quiet strip, not a set piece — py-section-sm keeps the page rhythm varied.
    <section className="py-section-sm" style={background ? { backgroundColor: background } : undefined}>
      <div className={`flex flex-col gap-10 ${CONTAINER}`}>
        <SectionHeaderBlock header={section.header} />
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {section.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2.5 border-t hairline pt-5">
              <dt className="text-2xs font-medium tracking-label text-[var(--color-ink)] uppercase">{item.heading}</dt>
              <dd className="text-sm leading-relaxed text-[var(--color-ink-muted)]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
