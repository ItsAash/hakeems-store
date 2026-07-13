'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body instead of in place. Required for any
 * fixed-position overlay (drawers, search, mobile menu) that lives inside the sticky
 * header: the header's `backdrop-blur` (backdrop-filter) makes it a containing block
 * for `position: fixed` descendants, so without a portal a "fixed inset-0" overlay
 * gets sized to the header's own box instead of the viewport.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
