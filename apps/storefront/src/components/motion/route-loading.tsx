import { SITE_NAME } from '@/lib/seo/site';
import { BreathingHairline } from '@/components/motion/loading-primitives';

/**
 * The branded route-loading mark (motion layer 2): the wordmark over a breathing
 * hairline — the intro's little sibling — for routes without a bespoke content skeleton.
 * Static by design (a loading boundary must paint instantly, so no CMS fetch here); the
 * wordmark comes from the app-level SITE_NAME setting, not hardcoded copy.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[55vh] flex-1 flex-col items-center justify-center gap-5" role="status" aria-label="Loading">
      <p aria-hidden className="font-serif text-3xl text-[var(--color-ink)]/80">{SITE_NAME}</p>
      <BreathingHairline className="w-28" />
    </div>
  );
}
