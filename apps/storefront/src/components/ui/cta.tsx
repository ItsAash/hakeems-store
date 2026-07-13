import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';

export type CtaVariant = 'primary' | 'secondary' | 'link';

const VARIANTS: Record<CtaVariant, string> = {
  // Solid ink pill (the New Arrivals / hero CTA look).
  primary:
    'inline-flex w-fit items-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-sm font-medium tracking-wide text-[var(--color-paper)] transition-opacity hover:opacity-90',
  // Outlined pill.
  secondary:
    'inline-flex w-fit items-center rounded-full border border-[var(--color-ink)] px-8 py-3.5 text-sm font-medium tracking-wide text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]',
  // Underlined text link (the "Shop all" rail look).
  link: 'inline-flex w-fit border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70',
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
