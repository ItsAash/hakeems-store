'use client';

import { useEffect, useState } from 'react';
import { isWishlisted, onWishlistChange, toggleWishlist } from '@/lib/wishlist';
import { HeartFilledIcon, HeartIcon } from '@/components/ui/icons';

/**
 * The one heart control used on cards and the PDP. Hydration-safe: renders unsaved on the
 * server, syncs from localStorage after mount. `size` picks the two contexts' hit targets.
 */
export function WishlistButton({
  slug,
  productName,
  size = 'card',
  className = '',
}: {
  slug: string;
  productName: string;
  size?: 'card' | 'pdp';
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isWishlisted(slug));
    return onWishlistChange(() => setSaved(isWishlisted(slug)));
  }, [slug]);

  const Icon = saved ? HeartFilledIcon : HeartIcon;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        setSaved(toggleWishlist(slug));
      }}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      aria-pressed={saved}
      className={`group/heart flex items-center justify-center transition-colors duration-200 ${
        size === 'card'
          ? 'h-9 w-9 bg-[var(--color-paper)]/85 backdrop-blur hover:bg-[var(--color-paper)]'
          : 'h-12 w-12 border border-[var(--color-hairline)] hover:border-[var(--color-ink)]'
      } ${className}`.trim()}
    >
      <Icon
        className={`h-[18px] w-[18px] transition-transform duration-200 group-active/heart:scale-90 ${
          saved ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]'
        }`}
      />
    </button>
  );
}
