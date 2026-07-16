import Link from 'next/link';
import type { FacetFilterGroup } from '@/lib/vendure/plp';
import {
  buildToggleHref,
  toURLSearchParams,
  type SearchParamsRecord,
} from '@/components/commerce/facet-filter-sidebar';
import { CloseIcon } from '@/components/ui/icons';

/**
 * The removable-pill row above the results grid — active filter state made visible and
 * individually dismissible without opening the sidebar/drawer. Pure links over the same
 * URL-driven filter model as the sidebar, so it works with JS disabled and stays in sync
 * with any other filter surface by construction.
 */
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
  if (activeFacetValueIds.length === 0) return null;

  const optionsById = new Map(
    groups.flatMap((group) => group.options.map((option) => [option.valueId, option.valueName] as const)),
  );

  const clearAllParams = toURLSearchParams(searchParams);
  clearAllParams.delete('facets');
  clearAllParams.delete('page');
  const clearAllQuery = clearAllParams.toString();
  const clearAllHref = clearAllQuery ? `${basePath}?${clearAllQuery}` : basePath;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {activeFacetValueIds.map((valueId) => {
        // A facet id can linger in the URL after results narrow past it; skip unnameable ones.
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
