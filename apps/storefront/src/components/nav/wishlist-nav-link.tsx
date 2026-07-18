'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getWishlist, onWishlistChange } from '@/lib/wishlist';
import { HeartIcon } from '@/components/ui/icons';

/** Nav heart with a live saved-count badge (localStorage-driven, hydration-safe). */
export function WishlistNavLink({ channelCode }: { channelCode: ChannelCode }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getWishlist().length);
    return onWishlistChange(() => setCount(getWishlist().length));
  }, []);

  return (
    <Link
      href={routes.wishlist(channelCode)}
      aria-label={count > 0 ? `Wishlist, ${count} saved` : 'Wishlist'}
      className="relative text-[var(--nav-fg)] transition-opacity duration-200 after:absolute after:-inset-3 hover:opacity-70"
    >
      <HeartIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-3xs font-medium text-[var(--color-paper)]">
          {count}
        </span>
      )}
    </Link>
  );
}
