import Link from 'next/link';
import type { ChannelDefinition } from '@/lib/channel';
import { withChannel } from '@/lib/channel';
import { routes } from '@/lib/routes';
import type { NavItem } from '@/lib/strapi/types';
import { getSiteNav } from '@/lib/strapi/queries';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CartWidget } from '@/components/nav/cart-widget';
import type { CartLine } from '@/components/commerce/cart-line-item';
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
        <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
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
  const sessionCookies = await getVendureSessionCookies();

  const [siteNav, { activeOrder }] = await Promise.all([
    getSiteNav(channel.code),
    getVendureClient(channel.code, sessionCookies).ActiveOrderFull(),
  ]);

  const items = siteNav?.items ?? [];
  const cartCount = activeOrder?.totalQuantity ?? 0;
  const cartLines: CartLine[] =
    activeOrder?.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      linePriceWithTax: line.linePriceWithTax,
      currencyCode: activeOrder.currencyCode,
      imageUrl: line.featuredAsset?.preview ?? null,
      productName: line.productVariant.name,
      productSlug: line.productVariant.product.slug,
      variantLabel: line.productVariant.options.map((option) => option.name).join(' / ') || null,
    })) ?? [];

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
          <Link href={routes.account(channel.code)} aria-label="Account" className="hidden text-[var(--nav-fg)] sm:block">
            <UserIcon className="h-5 w-5" />
          </Link>
          <CartWidget
            initialCount={cartCount}
            initialLines={cartLines}
            subTotalWithTax={activeOrder?.subTotalWithTax ?? 0}
            currencyCode={activeOrder?.currencyCode ?? channel.currencyCode}
            channelCode={channel.code}
          />
        </div>
      </div>
    </header>
  );
}
