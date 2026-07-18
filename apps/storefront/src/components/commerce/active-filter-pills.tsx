import Link from 'next/link';
import type { FacetFilterGroup } from '@/lib/medusa/facets';
import { buildToggleHref, toURLSearchParams, type SearchParamsRecord } from '@/lib/search-params';
import { CloseIcon } from '@/components/ui/icons';

function buildPriceClearHref(basePath: string, searchParams: SearchParamsRecord, key: 'priceMin' | 'priceMax'): string {
  const params = toURLSearchParams(searchParams);
  params.delete(key);
  params.delete('page');
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function ActiveFilterPills({
  groups,
  activeFacetValueIds,
  basePath,
  searchParams,
}: {
  groups: FacetFilterGroup[];
  activeFacetValueIds: string[];
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  const optionsById = new Map(
    groups.flatMap((group) => group.options.map((option) => [option.valueId, option.valueName] as const)),
  );

  const clearAllParams = toURLSearchParams(searchParams);
  clearAllParams.delete('facets');
  clearAllParams.delete('priceMin');
  clearAllParams.delete('priceMax');
  clearAllParams.delete('page');
  const clearAllQuery = clearAllParams.toString();
  const clearAllHref = clearAllQuery ? `${basePath}?${clearAllQuery}` : basePath;

  const priceMin = searchParams.priceMin as string | undefined;
  const priceMax = searchParams.priceMax as string | undefined;
  const hasFilters = activeFacetValueIds.length > 0 || priceMin || priceMax;

  if (!hasFilters) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {activeFacetValueIds.map((valueId) => {
        const name = optionsById.get(valueId);
        if (!name) return null;
        return (
          <Link
            key={valueId}
            href={buildToggleHref(basePath, searchParams, valueId, true)}
            scroll={false}
            className="flex items-center gap-1.5 border border-[var(--color-hairline)] bg-[var(--color-paper-raised)] py-1.5 pr-2 pl-3 text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
            aria-label={`Remove filter: ${name}`}
          >
            {name}
            <CloseIcon className="h-3 w-3 text-[var(--color-ink-muted)]" />
          </Link>
        );
      })}
      {priceMin && (
        <Link
          href={buildPriceClearHref(basePath, searchParams, 'priceMin')}
          scroll={false}
          className="flex items-center gap-1.5 border border-[var(--color-hairline)] bg-[var(--color-paper-raised)] py-1.5 pr-2 pl-3 text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
          aria-label={`Remove minimum price filter: NPR ${priceMin}`}
        >
          Min: NPR {priceMin}
          <CloseIcon className="h-3 w-3 text-[var(--color-ink-muted)]" />
        </Link>
      )}
      {priceMax && (
        <Link
          href={buildPriceClearHref(basePath, searchParams, 'priceMax')}
          scroll={false}
          className="flex items-center gap-1.5 border border-[var(--color-hairline)] bg-[var(--color-paper-raised)] py-1.5 pr-2 pl-3 text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
          aria-label={`Remove maximum price filter: NPR ${priceMax}`}
        >
          Max: NPR {priceMax}
          <CloseIcon className="h-3 w-3 text-[var(--color-ink-muted)]" />
        </Link>
      )}
      <Link
        href={clearAllHref}
        scroll={false}
        className="ml-1 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
      >
        Clear all
      </Link>
    </div>
  );
}
