/**
 * The centralized loading vocabulary (motion layer 2 — ENTERPRISE_OVERHAUL_LOG.md Part IV):
 * every async surface in the app composes these three primitives so waiting always looks
 * like the same house. None of them embeds product/CMS content — shape only.
 *
 *  - `SkeletonBlock`  — one fabric-shimmer placeholder block (the `.skeleton` utility).
 *  - `BreathingHairline` — the quiet inline "working" mark (the intro's rule, breathing).
 *  - `SearchRowSkeleton` — a suggestion-row shape for type-ahead surfaces.
 *
 * Route-level loading uses `RouteLoading` (breathing wordmark) or a bespoke page skeleton
 * built from `SkeletonBlock`s; in-component async states use the pieces below.
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`.trim()} />;
}

export function BreathingHairline({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`block h-px w-24 origin-center bg-[var(--color-ink)]/40 animate-loading-breathe ${className}`.trim()}
    />
  );
}

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
