'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { FacetFilterGroup } from '@/lib/medusa/facets';
import { toURLSearchParams, buildToggleHref, type SearchParamsRecord } from '@/lib/search-params';
import { CheckIcon, ChevronDownIcon, CloseIcon } from '@/components/ui/icons';

const INITIAL_VISIBLE_OPTIONS = 5;

function CollapsibleGroup({
  group,
  activeFacetValueIds,
  basePath,
  searchParams,
}: {
  group: FacetFilterGroup;
  activeFacetValueIds: string[];
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const hasManyOptions = group.options.length > INITIAL_VISIBLE_OPTIONS;
  const visibleOptions = showAll ? group.options : group.options.slice(0, INITIAL_VISIBLE_OPTIONS);
  const hiddenCount = group.options.length - INITIAL_VISIBLE_OPTIONS;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 flex w-full items-center justify-between text-xs font-semibold tracking-label text-[var(--color-ink)] uppercase"
      >
        {group.facetName}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-[var(--color-ink-muted)] transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {isOpen && (
        <>
          <ul className="flex flex-col gap-2.5">
            {visibleOptions.map((option) => {
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
          {hasManyOptions && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
            >
              Show {hiddenCount} more
            </button>
          )}
          {hasManyOptions && showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-2 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
            >
              Show less
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PriceRangeFilter({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [min, setMin] = useState((searchParams.priceMin as string) ?? '');
  const [max, setMax] = useState((searchParams.priceMax as string) ?? '');

  const apply = useCallback(() => {
    const params = toURLSearchParams(searchParams);
    if (min) params.set('priceMin', min);
    else params.delete('priceMin');
    if (max) params.set('priceMax', max);
    else params.delete('priceMax');
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }, [basePath, searchParams, min, max, router, pathname]);

  const clear = useCallback(() => {
    setMin('');
    setMax('');
    const params = toURLSearchParams(searchParams);
    params.delete('priceMin');
    params.delete('priceMax');
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }, [basePath, searchParams, router, pathname]);

  const hasPrice = !!(searchParams.priceMin || searchParams.priceMax);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 flex w-full items-center justify-between text-xs font-semibold tracking-label text-[var(--color-ink)] uppercase"
      >
        Price
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-[var(--color-ink-muted)] transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              onBlur={apply}
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              min={0}
              className="w-full border border-[var(--color-hairline)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]"
            />
            <span className="text-xs text-[var(--color-ink-muted)]">–</span>
            <input
              type="number"
              placeholder="Max"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              onBlur={apply}
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              min={0}
              className="w-full border border-[var(--color-hairline)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]"
            />
          </div>
          {hasPrice && (
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
            >
              <CloseIcon className="h-3 w-3" />
              Clear price
            </button>
          )}
        </div>
      )}
    </div>
  );
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
      <PriceRangeFilter basePath={basePath} searchParams={searchParams} />
      {groups.map((group) => (
        <CollapsibleGroup
          key={group.facetId}
          group={group}
          activeFacetValueIds={activeFacetValueIds}
          basePath={basePath}
          searchParams={searchParams}
        />
      ))}
    </div>
  );
}
