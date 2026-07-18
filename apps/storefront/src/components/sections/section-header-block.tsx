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
    <div className={`flex max-w-2xl flex-col gap-4 ${centered ? 'mx-auto items-center text-center' : ''}`}>
      {header.eyebrow && <p className="eyebrow">{header.eyebrow}</p>}
      <h2 className="font-serif text-display-lg text-[var(--color-ink)]">{header.heading}</h2>
      {header.subheading && <p className="max-w-xl text-[var(--color-ink-muted)]">{header.subheading}</p>}
    </div>
  );
}
