import { CONTAINER } from '@/lib/ui';

export default function Loading() {
  return (
    <main className="flex-1" aria-busy="true" aria-label="Loading product">
      <div className={`py-section-sm ${CONTAINER}`}>
        <div className="h-4 w-64 skeleton" />

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-3">
            <div className="aspect-[3/4] w-full skeleton" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 w-14 shrink-0 skeleton" />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-5 w-1/4 skeleton" />
            <div className="mt-4 h-4 w-24 skeleton" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 w-11 skeleton rounded-full bg-[var(--color-hairline)]" />
              ))}
            </div>
            <div className="mt-2 h-4 w-16 skeleton" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 w-14 skeleton" />
              ))}
            </div>
            <div className="mt-4 h-14 w-full skeleton" />
          </div>
        </div>
      </div>
    </main>
  );
}
