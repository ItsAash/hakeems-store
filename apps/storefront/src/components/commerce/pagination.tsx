import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function buildPageHref(basePath: string, searchParams: SearchParamsRecord, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && key !== 'page') params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function ArrowButton({
  href,
  disabled,
  label,
  icon: Icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: typeof ArrowLeftIcon;
}) {
  const className =
    'flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink)]/15 text-[var(--color-ink)] transition-colors duration-300';

  if (disabled) {
    return (
      <span className={`${className} opacity-30`} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} scroll={false} className={`${className} hover:border-[var(--color-ink)]`}>
      <Icon className="h-4 w-4" />
    </Link>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: SearchParamsRecord;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-6">
      <ArrowButton
        href={buildPageHref(basePath, searchParams, currentPage - 1)}
        disabled={currentPage <= 1}
        label="Previous page"
        icon={ArrowLeftIcon}
      />
      <span className="text-sm text-[var(--color-ink-muted)]">
        Page {currentPage} of {totalPages}
      </span>
      <ArrowButton
        href={buildPageHref(basePath, searchParams, currentPage + 1)}
        disabled={currentPage >= totalPages}
        label="Next page"
        icon={ArrowRightIcon}
      />
    </nav>
  );
}
