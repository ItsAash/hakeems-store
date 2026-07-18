import type { ChannelCode } from '@/lib/channel';
import type { FacetFilterGroup } from '@/lib/medusa/page-data';
import type { PlpSortKey } from '@/lib/medusa/products';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilterSidebar } from '@/components/commerce/facet-filter-sidebar';
import type { SearchParamsRecord } from '@/lib/search-params';
import { FilterDrawer } from '@/components/commerce/filter-drawer';
import { ActiveFilterPills } from '@/components/commerce/active-filter-pills';
import { SortSelect } from '@/components/commerce/sort-select';
import { Pagination } from '@/components/commerce/pagination';

/**
 * The one results shell shared by every product listing (shop, collection, search):
 * active-filter pills, the toolbar (count · mobile filter drawer · sort), the desktop
 * facet sidebar, the grid, and pagination. Pages fetch data; this owns the layout — so
 * a filtering UX improvement lands on all three listings at once, by construction.
 */
export function PlpResults({
  cards,
  channelCode,
  facetGroups,
  activeFacetValueIds,
  basePath,
  searchParams,
  sortKey,
  totalItems,
  currentPage,
  totalPages,
}: {
  cards: ProductCardModel[];
  channelCode: ChannelCode;
  facetGroups: FacetFilterGroup[];
  activeFacetValueIds: string[];
  basePath: string;
  searchParams: SearchParamsRecord;
  sortKey: PlpSortKey;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}) {
  const hasFacets = facetGroups.length > 0;

  return (
    <div className={`grid gap-10 lg:gap-14 ${hasFacets ? 'lg:grid-cols-[240px_1fr]' : ''}`}>
      {hasFacets && (
        // Sticky below the fixed header so filters stay at hand through a long grid.
        <aside className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="mb-6 border-b hairline pb-4 text-2xs font-medium tracking-label text-[var(--color-ink)] uppercase">
              Filters
            </p>
            <FacetFilterSidebar
              groups={facetGroups}
              activeFacetValueIds={activeFacetValueIds}
              basePath={basePath}
              searchParams={searchParams}
            />
          </div>
        </aside>
      )}

      <div className={hasFacets ? 'lg:col-start-2' : undefined}>
        <ActiveFilterPills
          groups={facetGroups}
          activeFacetValueIds={activeFacetValueIds}
          basePath={basePath}
          searchParams={searchParams}
        />

        {/* Hairline-framed toolbar: count reads as a quiet label, controls sit right. */}
        <div className="mb-10 flex items-center justify-between gap-4 border-y hairline py-3">
          <p className="text-2xs tracking-label text-[var(--color-ink-muted)] uppercase">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </p>
          <div className="flex items-center gap-3">
            <FilterDrawer
              groups={facetGroups}
              activeFacetValueIds={activeFacetValueIds}
              searchParams={searchParams}
            />
            <SortSelect currentSort={sortKey} />
          </div>
        </div>

        <ProductGrid cards={cards} channelCode={channelCode} />

        <Pagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} searchParams={searchParams} />
      </div>
    </div>
  );
}
