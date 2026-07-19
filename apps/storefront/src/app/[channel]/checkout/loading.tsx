import { CONTAINER } from '@/lib/ui';

export default function Loading() {
  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`} aria-busy="true" aria-label="Loading checkout">
      <div className="mb-10 h-9 w-40 skeleton md:h-10" />

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div className="h-4 w-48 skeleton" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-full skeleton" />
          ))}
        </div>

        <div className="flex flex-col gap-5 lg:border-l lg:hairline lg:pl-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="aspect-[4/5] h-16 w-16 shrink-0 skeleton" />
              <div className="h-4 flex-1 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
