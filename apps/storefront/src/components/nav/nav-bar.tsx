import Link from 'next/link';
import type { ChannelDefinition } from '@/lib/channel';
import { withChannel } from '@/lib/channel';
import { routes } from '@/lib/routes';
import type { NavItem } from '@/lib/strapi/types';
import { getSiteNav } from '@/lib/strapi/queries';
import { fetchCartAction } from '@/lib/medusa/cart-actions';
import { toCartLines, cartItemCount, toCartTotals } from '@/lib/medusa/cart-mapper';
import { CartWidget } from '@/components/nav/cart-widget';
import { MobileMenu } from '@/components/nav/mobile-menu';
import { SearchOverlay } from '@/components/nav/search-overlay';
import { WishlistNavLink } from '@/components/nav/wishlist-nav-link';
import { UserIcon } from '@/components/ui/icons';
import { CONTAINER } from '@/lib/ui';

function DesktopNavItem({ item, channelCode }: { item: NavItem; channelCode: ChannelDefinition['code'] }) {
  const hasChildren = item.children.length > 0;
  return (
    <div className="group relative flex h-full items-center">
      <Link
        href={withChannel(channelCode, item.href)}
        className="relative py-2 text-2xs font-medium tracking-label text-[var(--nav-fg)] uppercase after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-out hover:after:w-full"
      >
        {item.label}
      </Link>
      {hasChildren && (
        <div className="invisible absolute left-1/2 top-full z-30 -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="flex min-w-56 flex-col border hairline bg-[var(--color-paper-raised)] px-8 py-7 shadow-raised">
            {item.children.map((child) => (
              <Link
                key={child.id}
                href={withChannel(channelCode, child.href)}
                className="py-2 text-sm whitespace-nowrap text-[var(--color-ink-muted)] transition-colors duration-200 hover:text-[var(--color-ink)]"
              >
                {child.label}
              </Link>
            ))}
            <Link
              href={withChannel(channelCode, item.href)}
              className="mt-4 w-fit border-b border-[var(--color-ink)] pb-0.5 text-3xs font-medium tracking-label text-[var(--color-ink)] uppercase transition-opacity duration-200 hover:opacity-60"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export async function NavBar({ channel }: { channel: ChannelDefinition }) {
  const [siteNav, medusaCart] = await Promise.all([
    getSiteNav(channel.code).catch(() => null),
    fetchCartAction(channel.code),
  ]);

  const items = siteNav?.items ?? [];
  const cartCount = cartItemCount(medusaCart);
  const cartLines = toCartLines(medusaCart);
  const totals = toCartTotals(medusaCart, channel.currencyCode);

  return (
    <header>
      {/* Taller, airier bar on desktop; the nav rail is absolutely centered so it stays
          optically balanced regardless of wordmark/icon widths. */}
      <div className={`relative flex h-16 items-center justify-between lg:h-20 ${CONTAINER}`}>
        <div className="flex items-center gap-3">
          <MobileMenu items={items} channelCode={channel.code} />
          <Link
            href={routes.home(channel.code)}
            className="font-serif text-xl tracking-wide text-[var(--nav-fg)] lg:text-2xl"
          >
            Lopho
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden h-full -translate-x-1/2 items-center gap-10 md:flex">
          {items.map((item) => (
            <DesktopNavItem key={item.id} item={item} channelCode={channel.code} />
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <SearchOverlay channelCode={channel.code} />
          <WishlistNavLink channelCode={channel.code} />
          <Link
            href={routes.account(channel.code)}
            aria-label="Account"
            className="relative text-[var(--nav-fg)] transition-opacity duration-200 after:absolute after:-inset-3 hover:opacity-70"
          >
            <UserIcon className="h-5 w-5" />
          </Link>
          <CartWidget
            initialCount={cartCount}
            initialLines={cartLines}
            subTotalWithTax={totals.subtotal}
            currencyCode={totals.currencyCode}
            channelCode={channel.code}
          />
        </div>
      </div>
    </header>
  );
}
