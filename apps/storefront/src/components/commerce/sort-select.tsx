'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PLP_SORT_OPTIONS, type PlpSortKey } from '@/lib/medusa/products';
import { ChevronDownIcon } from '@/components/ui/icons';

export function SortSelect({ currentSort }: { currentSort: PlpSortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'relevance') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    // Native <select> for free keyboard/screen-reader/mobile-sheet semantics; only the
    // closed state is restyled (appearance-none + our own chevron) to match the hairline
    // design language.
    <div className="relative">
      <select
        value={currentSort}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Sort products"
        className="cursor-pointer appearance-none border border-[var(--color-hairline)] bg-[var(--color-paper)] py-2 pr-9 pl-3 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
      >
        {PLP_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-muted)]" />
    </div>
  );
}
