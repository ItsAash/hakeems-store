import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';

export type CtaVariant = 'primary' | 'secondary' | 'link';

/** The single button language: square (zero radius), uppercase micro type with CTA
 * tracking. Matches the PDP buy button so every call-to-action on the site speaks the
 * same visual dialect — no pills, no per-component reinventions. */
const VARIANTS: Record<CtaVariant, string> = {
  // Solid ink block.
  primary:
    'inline-flex w-fit items-center justify-center bg-[var(--color-ink)] px-10 py-4 text-2xs font-medium tracking-cta text-[var(--color-paper)] uppercase transition-opacity duration-300 hover:opacity-85',
  // Hairline-inked outline block.
  secondary:
    'inline-flex w-fit items-center justify-center border border-[var(--color-ink)] px-10 py-4 text-2xs font-medium tracking-cta text-[var(--color-ink)] uppercase transition-colors duration-300 hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]',
  // Underline text link — uppercase micro to match.
  link: 'inline-flex w-fit border-b border-[var(--color-ink)] pb-1 text-2xs font-medium tracking-cta text-[var(--color-ink)] uppercase transition-opacity duration-300 hover:opacity-60',
};

/**
 * Reusable call-to-action — the single, standard way to render a CTA/link across the
 * storefront (part of the shared primitive layer). Mirrors the Strapi `shared.cta`
 * component: `{ label, href, variant, openInNewTab }`. Channel-prefixes internal hrefs;
 * leaves absolute/external URLs and `mailto:`/`tel:` untouched.
 */
export function Cta({
  label,
  href,
  channelCode,
  variant = 'primary',
  openInNewTab = false,
  className = '',
}: {
  label: string;
  href: string;
  channelCode: ChannelCode;
  variant?: CtaVariant;
  openInNewTab?: boolean;
  className?: string;
}) {
  const isExternal = /^(https?:|mailto:|tel:)/.test(href);
  const resolved = isExternal ? href : withChannel(channelCode, href);
  const external = openInNewTab || isExternal;

  return (
    <Link
      href={resolved}
      className={`${VARIANTS[variant]} ${className}`.trim()}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </Link>
  );
}
