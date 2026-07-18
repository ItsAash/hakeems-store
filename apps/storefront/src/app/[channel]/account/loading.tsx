import { CONTAINER } from '@/lib/ui';

export default function Loading() {
  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`} aria-busy="true" aria-label="Loading account">
      <div className="mb-10 h-9 w-40 animate-pulse bg-[var(--color-hairline)] md:h-10" />
      <div className="flex flex-col gap-10 md:flex-row">
        <div className="flex flex-row gap-6 md:w-40 md:flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 animate-pulse bg-[var(--color-hairline)]" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 w-full max-w-sm animate-pulse bg-[var(--color-hairline)]" />
          ))}
        </div>
      </div>
    </main>
  );
}
