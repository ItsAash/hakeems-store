import Link from 'next/link';
import type { ChannelDefinition } from '@/lib/channel';
import { withChannel } from '@/lib/channel';
import { getSiteNav, getSiteSetting } from '@/lib/strapi/queries';
import { CONTAINER } from '@/lib/ui';
import { SocialIcon, socialLabel } from '@/components/ui/social-icons';
import { ChannelSwitcher } from '@/components/nav/channel-switcher';

/** Shared column heading: the site's eyebrow treatment, recoloured for the dark footer. */
function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs tracking-[0.14em] text-[var(--color-paper)]/45 uppercase">{children}</h2>
  );
}

/** Footer link with the same growing-underline hover as the primary nav. */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative w-fit text-sm text-[var(--color-paper)]/65 transition-colors duration-300 hover:text-[var(--color-paper)] after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-out hover:after:w-full"
    >
      {children}
    </Link>
  );
}

/**
 * Global site footer — a dark, editorial anchor built from the same design tokens as the
 * rest of the storefront (ink surface, paper text, clay accent, serif wordmark, animated
 * underline hovers). Everything is content-driven: brand, tagline, socials, support and
 * legal links come from Strapi's site-setting; the Shop column reuses the per-channel
 * site-nav. Renders resilient fallbacks if a field is missing.
 */
export async function Footer({ channel }: { channel: ChannelDefinition }) {
  const [siteSetting, siteNav] = await Promise.all([getSiteSetting(), getSiteNav(channel.code)]);

  const siteName = siteSetting?.siteName ?? 'Hakeems';
  const shopLinks = siteNav?.items ?? [];
  const socialLinks = siteSetting?.socialLinks ?? [];
  const legalLinks = siteSetting?.legalLinks ?? [];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[var(--color-ink)] text-[var(--color-paper)]">
      {/* Main columns */}
      <div className={`${CONTAINER} grid grid-cols-2 gap-x-8 gap-y-12 py-14 md:grid-cols-12 md:py-16`}>
        {/* Brand */}
        <div className="col-span-2 md:col-span-4">
          <Link
            href={`/${channel.code}`}
            className="font-serif text-2xl font-semibold tracking-wide text-[var(--color-paper)]"
          >
            {siteName}
          </Link>
          {siteSetting?.tagline && (
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-paper)]/60">{siteSetting.tagline}</p>
          )}
          {socialLinks.length > 0 && (
            <div className="mt-7 flex items-center gap-5">
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabel(social.platform)}
                  className="text-[var(--color-paper)]/55 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--color-paper)]"
                >
                  <SocialIcon platform={social.platform} className="h-5 w-5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Shop */}
        {shopLinks.length > 0 && (
          <nav className="md:col-span-3" aria-label="Shop">
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="mt-5 flex flex-col gap-3.5">
              {shopLinks.map((item) => (
                <li key={item.id}>
                  <FooterLink href={withChannel(channel.code, item.href)}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Support */}
        <div className="md:col-span-3">
          <ColumnHeading>Support</ColumnHeading>
          <ul className="mt-5 flex flex-col gap-3.5">
            <li>
              <FooterLink href={`/${channel.code}/account`}>My Account</FooterLink>
            </li>
            {siteSetting?.supportEmail && (
              <li>
                <FooterLink href={`mailto:${siteSetting.supportEmail}`}>{siteSetting.supportEmail}</FooterLink>
              </li>
            )}
            {siteSetting?.supportPhone && (
              <li>
                <FooterLink href={`tel:${siteSetting.supportPhone.replace(/\s+/g, '')}`}>
                  {siteSetting.supportPhone}
                </FooterLink>
              </li>
            )}
          </ul>
        </div>

        {/* Legal */}
        {legalLinks.length > 0 && (
          <nav className="md:col-span-2" aria-label="Legal">
            <ColumnHeading>Legal</ColumnHeading>
            <ul className="mt-5 flex flex-col gap-3.5">
              {legalLinks.map((link) => (
                <li key={link.id}>
                  <FooterLink href={withChannel(channel.code, link.href)}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-paper)]/10">
        <div
          className={`${CONTAINER} flex flex-col gap-3 py-6 text-xs text-[var(--color-paper)]/45 md:flex-row md:items-center md:justify-between`}
        >
          <p>© {year} {siteName}. All rights reserved.</p>
          {siteSetting?.footerNote && <p className="max-w-md md:text-center">{siteSetting.footerNote}</p>}
          <ChannelSwitcher channelCode={channel.code} />
        </div>
      </div>
    </footer>
  );
}
