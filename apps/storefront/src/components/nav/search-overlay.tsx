'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import type { PlpProduct } from '@/lib/vendure/plp';
import { searchSuggestionsAction } from '@/lib/vendure/search-actions';
import { formatPriceRange } from '@/lib/format';
import { SearchIcon, CloseIcon } from '@/components/ui/icons';
import { Overlay } from '@/components/ui/overlay';

const DEBOUNCE_MS = 250;

export function SearchOverlay({ channelCode }: { channelCode: ChannelCode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PlpProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const currentRequest = ++requestId.current;
    const timeout = setTimeout(async () => {
      const results = await searchSuggestionsAction(channelCode, trimmed);
      // Discard stale responses if the term changed again while this request was in flight.
      if (currentRequest === requestId.current) {
        setSuggestions(results);
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [term, channelCode]);

  const close = () => {
    setIsOpen(false);
    setTerm('');
    setSuggestions([]);
  };

  const goToResults = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    router.push(routes.search(channelCode, trimmed));
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        aria-haspopup="dialog"
        className="text-[var(--nav-fg)]"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      <Overlay
        open={isOpen}
        onClose={close}
        label="Search"
        panelClassName="absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto border-b hairline bg-[var(--color-paper-raised)] px-6 py-8"
        panelClosedClassName="-translate-y-full"
        panelOpenClassName="translate-y-0"
      >
        <div className="mx-auto max-w-2xl">
          <form onSubmit={goToResults} className="flex items-center gap-4">
            <SearchIcon className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products…"
              className="w-full border-none bg-transparent font-serif text-2xl text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
            />
            <button type="button" onClick={close} aria-label="Close search">
              <CloseIcon className="h-5 w-5" />
            </button>
          </form>

          {term.trim().length >= 2 && (
                  <div className="mt-8 border-t hairline pt-6">
                    {isLoading && suggestions.length === 0 ? (
                      <p className="text-sm text-[var(--color-ink-muted)]">Searching…</p>
                    ) : suggestions.length === 0 ? (
                      <p className="text-sm text-[var(--color-ink-muted)]">No products found for “{term.trim()}”.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {suggestions.map((product) => (
                          <li key={product.productId}>
                            <Link
                              href={routes.product(channelCode, product.slug)}
                              onClick={close}
                              className="flex items-center gap-4 rounded-sm px-2 py-2 transition-colors hover:bg-[var(--color-paper)]"
                            >
                              <div className="h-14 w-12 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
                                {product.imageUrl && (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="flex flex-1 flex-col gap-0.5">
                                <span className="text-sm font-medium text-[var(--color-ink)]">{product.name}</span>
                                <span className="text-xs text-[var(--color-ink-muted)]">
                                  {formatPriceRange(product.priceMin, product.priceMax, product.currencyCode)}
                                </span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {suggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => goToResults()}
                        className="mt-4 border-b border-[var(--color-ink)] pb-0.5 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
                      >
                        View all results for “{term.trim()}”
                      </button>
                    )}
            </div>
          )}
        </div>
      </Overlay>
    </>
  );
}
