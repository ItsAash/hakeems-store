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
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item) => (
            <li key={item.id} className="flex h-full flex-col gap-5 bg-[var(--color-paper-raised)] p-7">
              <blockquote className="flex-1 font-serif text-lg leading-relaxed text-[var(--color-ink)]">
                “{item.quote}”
              </blockquote>
              <footer className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-[var(--color-ink)]">{item.author}</p>
                {item.context && <p className="text-xs text-[var(--color-ink-muted)]">{item.context}</p>}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
