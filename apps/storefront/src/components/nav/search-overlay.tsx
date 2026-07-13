'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchIcon, CloseIcon } from '@/components/ui/icons';
import { Portal } from '@/components/ui/portal';

/**
 * Trigger + overlay shell only — the input doesn't call Vendure's `search` query yet.
 * Phase 6 (PLP) wires this up to the same search Vendure query used there.
 */
export function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} aria-label="Search" className="text-[var(--nav-fg)]">
        <SearchIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[var(--color-ink)]/40"
            />
            <div className="absolute inset-x-0 top-0 border-b hairline bg-[var(--color-paper-raised)] px-6 py-8">
              <div className="mx-auto flex max-w-2xl items-center gap-4">
                <SearchIcon className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Search products…"
                  className="w-full border-none bg-transparent font-serif text-2xl text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
                />
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close search">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
