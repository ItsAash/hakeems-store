'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PLP_SORT_OPTIONS, type PlpSortKey } from '@/lib/vendure/plp';

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
    <select
      value={currentSort}
      onChange={(event) => handleChange(event.target.value)}
      aria-label="Sort products"
      className="border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)]"
    >
      {PLP_SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
