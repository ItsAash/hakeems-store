'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { FacetFilterGroup } from '@/lib/medusa/facets';
import { toURLSearchParams, type SearchParamsRecord } from '@/lib/search-params';
import { Overlay } from '@/components/ui/overlay';
import { CheckIcon, ChevronDownIcon, CloseIcon } from '@/components/ui/icons';

const INITIAL_VISIBLE_OPTIONS = 5;

function DrawerFilterGroup({
  group,
  pending,
  togglePending,
}: {
  group: FacetFilterGroup;
  pending: Set<string>;
  togglePending: (valueId: string) => void;
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
          <ul className="flex flex-col gap-1">
            {visibleOptions.map((option) => {
              const isChecked = pending.has(option.valueId);
              return (
                <li key={option.valueId}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => togglePending(option.valueId)}
                    className={`flex w-full items-center justify-between gap-3 py-2 text-sm transition-colors ${
                      isChecked ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                          isChecked
                            ? 'border-[var(--color-ink)] bg-[var(--color-ink)]'
                            : 'border-[var(--color-hairline)]'
                        }`}
                      >
                        {isChecked && <CheckIcon className="h-3 w-3 text-[var(--color-paper)]" />}
                      </span>
                      {option.valueName}
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{option.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasManyOptions && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-1 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
            >
              Show {hiddenCount} more
            </button>
          )}
          {hasManyOptions && showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-1 text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
            >
              Show less
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DrawerPriceRange({
  searchParams,
  onNavigate,
}: {
  searchParams: SearchParamsRecord;
  onNavigate: () => void;
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
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    onNavigate();
  }, [searchParams, min, max, router, pathname, onNavigate]);

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
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              min={0}
              className="w-full border border-[var(--color-hairline)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]"
            />
            <button
              type="button"
              onClick={apply}
              className="shrink-0 bg-[var(--color-ink)] px-3 py-2 text-xs font-medium text-[var(--color-paper)] transition-opacity hover:opacity-90"
            >
              Go
            </button>
          </div>
          {hasPrice && (
            <button
              type="button"
              onClick={() => { setMin(''); setMax(''); }}
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

/**
 * The mobile/tablet filter surface (`< lg`, where the sidebar is hidden). Standard batch
 * pattern: selections are staged locally while the drawer is open, then applied in one
 * navigation — so toggling five facets is one round trip, and closing without applying
 * discards cleanly. Desktop keeps the immediate link-driven sidebar.
 */
export function FilterDrawer({
  groups,
  activeFacetValueIds,
  searchParams,
}: {
  groups: FacetFilterGroup[];
  activeFacetValueIds: string[];
  searchParams: SearchParamsRecord;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  if (groups.length === 0) return null;

  const open = () => {
    setPending(new Set(activeFacetValueIds));
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  const togglePending = (valueId: string) => {
    setPending((current) => {
      const next = new Set(current);
      if (next.has(valueId)) {
        next.delete(valueId);
      } else {
        next.add(valueId);
      }
      return next;
    });
  };

  const navigate = (facetIds: Set<string>) => {
    const params = toURLSearchParams(searchParams);
    if (facetIds.size > 0) {
      params.set('facets', Array.from(facetIds).join(','));
    } else {
      params.delete('facets');
    }
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-2 border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] lg:hidden"
      >
        Filter
        {activeFacetValueIds.length > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-ink)] px-1 text-3xs font-medium text-[var(--color-paper)]">
            {activeFacetValueIds.length}
          </span>
        )}
      </button>

      <Overlay
        open={isOpen}
        onClose={close}
        label="Filters"
        panelClassName="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-[var(--color-paper-raised)] shadow-xl"
        panelClosedClassName="translate-x-full"
        panelOpenClassName="translate-x-0"
      >
        <div className="flex items-center justify-between border-b hairline px-6 py-5">
          <h2 className="text-sm tracking-wide uppercase">Filter</h2>
          <button type="button" onClick={close} aria-label="Close filters" className="relative after:absolute after:-inset-3">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          <DrawerPriceRange searchParams={searchParams} onNavigate={close} />
          {groups.map((group) => (
            <DrawerFilterGroup
              key={group.facetId}
              group={group}
              pending={pending}
              togglePending={togglePending}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t hairline p-6">
          <button
            type="button"
            onClick={() => navigate(pending)}
            className="flex w-full items-center justify-center bg-[var(--color-ink)] px-6 py-3.5 text-sm tracking-wide text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => navigate(new Set())}
            disabled={pending.size === 0 && activeFacetValueIds.length === 0}
            className="text-center text-xs text-[var(--color-ink-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)] disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </Overlay>
    </>
  );
}
