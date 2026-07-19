/** Mirrors the search suggestion row (thumb + name/price lines) so results replace the
 * placeholder without any layout shift. */
export function SearchRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-2 py-2">
          <div className="h-14 w-12 shrink-0 skeleton" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-40 skeleton" />
            <div className="h-3 w-16 skeleton" />
          </div>
        </li>
      ))}
    </ul>
  );
}
