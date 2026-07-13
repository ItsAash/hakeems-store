import Link from 'next/link';
import type { FacetFilterGroup } from '@/lib/vendure/plp';
import { CheckIcon } from '@/components/ui/icons';

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function toURLSearchParams(searchParams: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

function buildToggleHref(basePath: string, searchParams: SearchParamsRecord, valueId: string, isActive: boolean): string {
  const params = toURLSearchParams(searchParams);
  const activeIds = new Set((params.get('facets') ?? '').split(',').filter(Boolean));

  if (isActive) {
    activeIds.delete(valueId);
  } else {
    activeIds.add(valueId);
  }

  if (activeIds.size > 0) {
    params.set('facets', Array.from(activeIds).join(','));
  } else {
    params.delete('facets');
  }
  params.delete('page'); // any filter change starts back at page 1

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function FacetFilterSidebar({
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
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.facetId}>
          <h3 className="mb-3 text-xs font-semibold tracking-[0.1em] text-[var(--color-ink)] uppercase">
            {group.facetName}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {group.options.map((option) => {
              const isActive = activeFacetValueIds.includes(option.valueId);
              return (
                <li key={option.valueId}>
                  <Link
                    href={buildToggleHref(basePath, searchParams, option.valueId, isActive)}
                    scroll={false}
                    aria-current={isActive}
                    className={`flex items-center justify-between gap-3 text-sm transition-colors ${
                      isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                          isActive ? 'border-[var(--color-ink)] bg-[var(--color-ink)]' : 'border-[var(--color-hairline)]'
                        }`}
                      >
                        {isActive && <CheckIcon className="h-3 w-3 text-[var(--color-paper)]" />}
                      </span>
                      {option.valueName}
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{option.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
