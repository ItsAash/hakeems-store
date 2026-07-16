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
    <section className="py-section" style={background ? { backgroundColor: background } : undefined}>
      <div className={`flex flex-col gap-12 ${CONTAINER}`}>
        <SectionHeaderBlock header={section.header} />
        <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 border-t hairline pt-5">
              <dt className="text-sm font-medium tracking-wide text-[var(--color-ink)]">{item.heading}</dt>
              <dd className="text-sm leading-relaxed text-[var(--color-ink-muted)]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
