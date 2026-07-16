import type { SectionHeader } from '@/lib/strapi/types';

/**
 * The one way a section renders its Strapi `shared.section-header` — eyebrow, serif
 * heading, muted subheading, honoring the editor's left/center alignment. Every new
 * section block composes this instead of re-implementing the triple.
 */
export function SectionHeaderBlock({ header }: { header: SectionHeader | null }) {
  if (!header) return null;
  const centered = header.align === 'center';
  return (
    <div className={`flex max-w-xl flex-col gap-3 ${centered ? 'mx-auto items-center text-center' : ''}`}>
      {header.eyebrow && <p className="eyebrow">{header.eyebrow}</p>}
      <h2 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">{header.heading}</h2>
      {header.subheading && <p className="text-[var(--color-ink-muted)]">{header.subheading}</p>}
    </div>
  );
}
