import Link from 'next/link';
import type { ChannelCode, ChannelDefinition } from '@/lib/channel';
import { withChannel } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getFooter } from '@/lib/strapi/queries';
import { CONTAINER } from '@/lib/ui';
import { SocialIcon, socialLabel } from '@/components/ui/social-icons';
import { ChannelSwitcher } from '@/components/nav/channel-switcher';
import { NewsletterForm } from '@/components/nav/newsletter-form';

/** Shared column heading: the site's eyebrow treatment, recoloured for the dark footer. */
function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs tracking-[0.14em] text-[var(--color-paper)]/45 uppercase">{children}</h2>
  );
}

/**
 * Footer link with the same growing-underline hover as the primary nav. Internal paths
 * (starting with `/`) are channel-scoped and use next/link; absolute URLs open in a new tab.
 */
function FooterLink({ href, channelCode, children }: { href: string; channelCode: ChannelCode; children: React.ReactNode }) {
  const className =
    'relative w-fit text-sm text-[var(--color-paper)]/65 transition-colors duration-300 hover:text-[var(--color-paper)] after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-out hover:after:w-full';

  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  const internal = href.startsWith('/') ? withChannel(channelCode, href) : href;
  return (
    <Link href={internal} className={className}>
      {children}
    </Link>
  );
}

/**
 * Global site footer — a dark, editorial anchor built from the storefront's design tokens
 * (ink surface, paper text, accent, serif wordmark, animated underline hovers). Every piece
 * of content — brand blurb, link columns, contact, socials, newsletter copy, legal links and
 * copyright — is authored in Strapi's `footer` single type; NOTHING here is hardcoded. Column
 * headings and their links are fully editor-defined, so admins add, rename or reorder columns
 * (navigation, categories, policies…) without any code change. Renders resilient fallbacks so
 * a missing field or an unseeded footer never breaks the page.
 */
export async function Footer({ channel }: { channel: ChannelDefinition }) {
  const footer = await getFooter();

  const brandName = footer?.brandName ?? 'Hakeems';
  const columns = footer?.columns ?? [];
  const contact = footer?.contact ?? null;
  const socialLinks = footer?.socialLinks ?? [];
  const legalLinks = footer?.legalLinks ?? [];
  const newsletter = footer?.newsletter ?? null;

  const year = new Date().getFullYear();
  const copyright = (footer?.copyrightText ?? '© {year} {brandName}. All rights reserved.')
    .replace(/\{year\}/g, String(year))
    .replace(/\{siteName\}/g, brandName)
    .replace(/\{brandName\}/g, brandName);

  const hasContact = contact && (contact.email || contact.phone || contact.address);
  const phoneHref = contact?.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <footer className="mt-auto bg-[var(--color-ink)] text-[var(--color-paper)]">
      {/* Newsletter band */}
      {newsletter?.enabled && (newsletter.heading || newsletter.description) && (
        <div className="border-b border-[var(--color-paper)]/10">
          <div
            className={`${CONTAINER} flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14`}
          >
            <div className="max-w-md">
              {newsletter.heading && (
                <h2 className="font-serif text-2xl tracking-wide text-[var(--color-paper)]">{newsletter.heading}</h2>
              )}
              {newsletter.description && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-paper)]/60">{newsletter.description}</p>
              )}
            </div>
            <NewsletterForm
              placeholder={newsletter.placeholder ?? 'Enter your email'}
              buttonLabel={newsletter.buttonLabel ?? 'Subscribe'}
              successMessage={newsletter.successMessage ?? "Thanks — you're on the list."}
            />
          </div>
        </div>
      )}

      {/* Main columns */}
      <div className={`${CONTAINER} grid grid-cols-2 gap-x-8 gap-y-12 py-14 md:grid-cols-12 md:py-16`}>
        {/* Brand */}
        <div className="col-span-2 md:col-span-4">
          <Link
            href={routes.home(channel.code)}
            className="font-serif text-2xl font-semibold tracking-wide text-[var(--color-paper)]"
          >
            {brandName}
          </Link>
          {footer?.brandTagline && (
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-paper)]/60">{footer.brandTagline}</p>
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

        {/* Editor-defined link columns + contact */}
        <div className="col-span-2 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:col-span-8 md:grid-cols-4">
          {columns.map((column) => (
            <nav key={column.id} aria-label={column.heading}>
              <ColumnHeading>{column.heading}</ColumnHeading>
              <ul className="mt-5 flex flex-col gap-3.5">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <FooterLink href={link.href} channelCode={channel.code}>
                      {link.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {hasContact && (
            <div>
              <ColumnHeading>{contact.heading ?? 'Contact'}</ColumnHeading>
              <ul className="mt-5 flex flex-col gap-3.5">
                {contact.email && (
                  <li>
                    <FooterLink href={`mailto:${contact.email}`} channelCode={channel.code}>
                      {contact.email}
                    </FooterLink>
                  </li>
                )}
                {contact.phone && phoneHref && (
                  <li>
                    <FooterLink href={phoneHref} channelCode={channel.code}>
                      {contact.phone}
                    </FooterLink>
                  </li>
                )}
                {contact.address && (
                  <li className="text-sm leading-relaxed whitespace-pre-line text-[var(--color-paper)]/60">
                    {contact.address}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-paper)]/10">
        <div
          className={`${CONTAINER} flex flex-col gap-3 py-6 text-xs text-[var(--color-paper)]/45 md:flex-row md:items-center md:justify-between`}
        >
          <p>{copyright}</p>
          {legalLinks.length > 0 && (
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.id}>
                  <FooterLink href={link.href} channelCode={channel.code}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          )}
          {footer?.footerNote && <p className="max-w-md md:text-center">{footer.footerNote}</p>}
          <ChannelSwitcher channelCode={channel.code} />
        </div>
      </div>
    </footer>
  );
}
