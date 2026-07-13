'use client';

import { useState } from 'react';

export type ProductDetailsTab = { id: string; label: string; content: string | null | undefined };

/**
 * Refined, minimalist tabbed panel for the PDP (Details · Fit & Fabric · Shipping &
 * Returns). Matches the site's design language — hairline rules, ink/muted type, and the
 * same growing/underline active indicator used elsewhere. Content is product data from
 * Vendure (HTML), rendered through the shared `prose` styles. Tabs with no content are
 * dropped, so a product missing "Fit & Fabric" simply doesn't show that tab.
 */
export function ProductDetailsTabs({ tabs }: { tabs: ProductDetailsTab[] }) {
  const available = tabs.filter((tab): tab is ProductDetailsTab & { content: string } => Boolean(tab.content?.trim()));
  const [activeId, setActiveId] = useState(available[0]?.id ?? '');

  const activeTab = available.find((tab) => tab.id === activeId) ?? available[0];
  if (!activeTab) return null;

  return (
    <div className="border-t hairline pt-6">
      <div role="tablist" aria-label="Product details" className="flex flex-wrap gap-x-8 gap-y-2 border-b hairline">
        {available.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={`relative -mb-px pb-3 text-sm font-medium transition-colors duration-200 ${
                isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab.label}
              <span
                className={`absolute -bottom-px left-0 h-px w-full bg-[var(--color-ink)] transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        key={activeTab.id}
        className="prose prose-sm mt-6 max-w-none text-[var(--color-ink-muted)]"
        dangerouslySetInnerHTML={{ __html: activeTab.content }}
      />
    </div>
  );
}
