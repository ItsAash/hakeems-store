import { CONTAINER } from '@/lib/ui';
import type { SectionOf } from '@/lib/strapi/types';
import { resolveColorToken } from '@/lib/design/color-tokens';
import { SectionHeaderBlock } from '@/components/sections/section-header-block';

/**
 * `section.testimonials` — a customer quote wall. Quotes are Strapi-authored
 * (`layout.testimonial` items); renders nothing without items.
 */
export function TestimonialsBlock({ section }: { section: SectionOf<'section.testimonials'> }) {
  if (section.items.length === 0) return null;
  const background = resolveColorToken(section.backgroundToken);

  return (
    <section className="py-section" style={background ? { backgroundColor: background } : undefined}>
      <div className={`flex flex-col gap-12 ${CONTAINER}`}>
        <SectionHeaderBlock header={section.header} />
        {/* Plain pull-quotes on hairline rules — no card boxes; the words carry the section. */}
        <ul className="grid gap-x-12 gap-y-10 md:grid-cols-3">
          {section.items.map((item) => (
            <li key={item.id} className="flex h-full flex-col gap-6 border-t hairline pt-6">
              <blockquote className="flex-1 font-serif text-xl leading-snug text-[var(--color-ink)]">
                “{item.quote}”
              </blockquote>
              <footer className="flex flex-col gap-1">
                <p className="text-2xs font-medium tracking-label text-[var(--color-ink)] uppercase">{item.author}</p>
                {item.context && <p className="text-xs text-[var(--color-ink-muted)]">{item.context}</p>}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
