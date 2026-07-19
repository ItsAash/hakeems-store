import { CONTAINER } from '@/lib/ui';

/**
 * Route-level loading state for every product listing (shop / collection / search).
 * Mirrors the real page's geometry — title row, toolbar, sidebar column, and the same
 * 2/3/4-column grid of 4:5 tiles — so the content swap is zero-layout-shift.
 */
export function PlpSkeleton() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading products">
      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <div className="h-9 w-48 skeleton md:h-10" />
      </div>

      <div className={`pb-section ${CONTAINER}`}>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-12">
          <aside className="hidden flex-col gap-8 lg:flex">
            {Array.from({ length: 3 }).map((_, group) => (
              <div key={group} className="flex flex-col gap-3">
                <div className="h-3 w-20 skeleton" />
                {Array.from({ length: 4 }).map((_, row) => (
                  <div key={row} className="h-4 w-36 skeleton" />
                ))}
              </div>
            ))}
          </aside>

          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="h-4 w-16 skeleton" />
              <div className="h-9 w-40 skeleton" />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <div className="aspect-[4/5] skeleton" />
                  <div className="h-4 w-3/4 skeleton" />
                  <div className="h-4 w-1/3 skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
