'use client';

import { useId, useRef, useState } from 'react';
import { Accordion } from '@/components/ui/accordion';

export type ProductDetailsTab = { id: string; label: string; content: React.ReactNode };

/**
 * PDP detail panels (Details · Fit & Fabric · Shipping & Returns · CMS panels).
 * Desktop (`lg+`) renders the tabbed panel — full ARIA tabs pattern: roving tabindex,
 * Arrow/Home/End keyboard navigation, and `aria-controls`/`aria-labelledby` pairing.
 * Below `lg` the same items render through the shared Accordion primitive, which reads
 * far better than horizontal tabs on narrow viewports. Content is ReactNode, so callers
 * mix Vendure HTML and Strapi Markdown freely. Empty tabs are dropped upstream.
 */
export function ProductDetailsTabs({ tabs }: { tabs: ProductDetailsTab[] }) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!activeTab) return null;

  const focusTab = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    setActiveId(tab.id);
    tabRefs.current.get(tab.id)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(tabs.length - 1);
        break;
    }
  };

  return (
    <div className="border-t hairline pt-6">
      {/* Mobile: stacked disclosure — every panel reachable without horizontal cramming. */}
      <div className="lg:hidden">
        <Accordion
          items={tabs.map((tab) => ({ id: tab.id, label: tab.label, content: tab.content }))}
          defaultOpenId={tabs[0]?.id ?? null}
        />
      </div>

      {/* Desktop: tabs. */}
      <div className="hidden lg:block">
        <div role="tablist" aria-label="Product details" className="flex flex-wrap gap-x-8 gap-y-2 border-b hairline">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(tab.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`relative -mb-px pb-3 text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {tab.label}
                <span
                  aria-hidden
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
          role="tabpanel"
          id={`${baseId}-panel-${activeTab.id}`}
          aria-labelledby={`${baseId}-tab-${activeTab.id}`}
          tabIndex={0}
          className="mt-6 text-sm text-[var(--color-ink-muted)]"
        >
          {activeTab.content}
        </div>
      </div>
    </div>
  );
}
