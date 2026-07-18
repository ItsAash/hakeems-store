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
import { UserIcon } from '@/components/ui/icons';
import { CONTAINER } from '@/lib/ui';

function DesktopNavItem({ item, channelCode }: { item: NavItem; channelCode: ChannelDefinition['code'] }) {
  const hasChildren = item.children.length > 0;
  return (
    <div className="group relative">
      <Link
        href={withChannel(channelCode, item.href)}
        className="relative text-sm font-semibold text-[var(--nav-fg)] after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-out hover:after:w-full"
      >
        {item.label}
      </Link>
      {hasChildren && (
        <div className="invisible absolute left-1/2 top-full z-30 -translate-x-1/2 pt-4 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
          <div className="flex min-w-40 flex-col gap-3 border hairline bg-[var(--color-paper-raised)] p-5 shadow-sm">
            {item.children.map((child) => (
              <Link
                key={child.id}
                href={withChannel(channelCode, child.href)}
                className="text-sm font-medium whitespace-nowrap text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                {child.label}
              </Link>
            ))}
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
      <div className={`flex h-16 items-center justify-between ${CONTAINER}`}>
        <div className="flex items-center gap-3">
          <MobileMenu items={items} channelCode={channel.code} />
          <Link href={routes.home(channel.code)} className="font-serif text-lg font-semibold tracking-wide text-[var(--nav-fg)]">
            Hakeems
          </Link>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <DesktopNavItem key={item.id} item={item} channelCode={channel.code} />
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <SearchOverlay channelCode={channel.code} />
          <Link
            href={routes.account(channel.code)}
            aria-label="Account"
            className="relative text-[var(--nav-fg)] after:absolute after:-inset-3"
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
