'use client';

/**
 * Lightweight client-side wishlist: product handles in localStorage, cross-component sync
 * via a window event (same pattern as cart-events). Deliberately no server persistence yet
 * — the upgrade path is syncing this list to customer metadata after login, which changes
 * nothing about the consumers below.
 */

const STORAGE_KEY = 'lopho_wishlist';
export const WISHLIST_EVENT = 'lopho:wishlist-changed';

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Private mode / quota — the heart simply won't persist.
  }
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
}

export function isWishlisted(slug: string): boolean {
  return getWishlist().includes(slug);
}

/** Toggle a product handle; returns the new saved-state. */
export function toggleWishlist(slug: string): boolean {
  const current = getWishlist();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
  write(next);
  return next.includes(slug);
}

/** Subscribe to changes (fires across components in this tab). Returns an unsubscribe. */
export function onWishlistChange(listener: () => void): () => void {
  window.addEventListener(WISHLIST_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(WISHLIST_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
