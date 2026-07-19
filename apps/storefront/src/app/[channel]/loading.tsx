import { RouteLoading } from '@/components/motion/route-loading';

/** Segment-level fallback for channel routes without a bespoke skeleton (home, cart,
 * wishlist, legal, auth…) — the branded breathing mark instead of a blank frame. */
export default function ChannelLoading() {
  return <RouteLoading />;
}
