import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';

export type BreadcrumbItem = { name: string; slug: string };

/** Vendure's collection breadcrumbs always start with its internal
 * `__root_collection__` — never shown or linked. */
const VENDURE_ROOT_COLLECTION_SLUG = '__root_collection__';

export function Breadcrumbs({
  items,
  channelCode,
  basePath = '/collections',
}: {
  items: BreadcrumbItem[];
  channelCode: ChannelCode;
  basePath?: string;
}) {
  const visibleItems = items.filter((item) => item.slug !== VENDURE_ROOT_COLLECTION_SLUG);

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
      <Link href={withChannel(channelCode, '/')} className="hover:text-[var(--color-ink)]">
        Home
      </Link>
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        return (
          <span key={item.slug} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {isLast ? (
              <span className="text-[var(--color-ink)]">{item.name}</span>
            ) : (
              <Link href={withChannel(channelCode, `${basePath}/${item.slug}`)} className="hover:text-[var(--color-ink)]">
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
