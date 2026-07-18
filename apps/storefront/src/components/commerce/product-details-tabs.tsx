'use client';

import { Accordion } from '@/components/ui/accordion';

export type ProductDetailsTab = { id: string; label: string; content: React.ReactNode };

/**
 * PDP detail panels (Details · Fit & Fabric · Shipping & Returns · CMS panels), rendered
 * as stacked accordion drop-downs at every breakpoint — the luxury-PDP convention (Prada/
 * Skims reference): every panel is reachable in place, panel count is unbounded (CMS
 * panels can grow), and the pattern reads identically on mobile and desktop. Replaces the
 * previous desktop tab strip. Content is ReactNode, so callers mix Medusa metadata text
 * and Strapi Markdown freely; empty tabs are dropped upstream.
 */
export function ProductDetailsTabs({ tabs }: { tabs: ProductDetailsTab[] }) {
  if (tabs.length === 0) return null;

  return (
    <div className="border-t hairline pt-2">
      <Accordion
        items={tabs.map((tab) => ({ id: tab.id, label: tab.label, content: tab.content }))}
        defaultOpenId={tabs[0]?.id ?? null}
      />
    </div>
  );
}
