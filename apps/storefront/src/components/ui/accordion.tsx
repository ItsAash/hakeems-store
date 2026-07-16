'use client';

import { useId, useState } from 'react';
import { ChevronDownIcon } from '@/components/ui/icons';

export type AccordionItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

/**
 * The single disclosure primitive behind every expand/collapse surface — FAQ sections,
 * PDP detail panels, collapsible filter groups. ARIA disclosure pattern
 * (`button[aria-expanded]` ↔ `region[aria-labelledby]`), with the height animated via the
 * CSS `grid-template-rows: 0fr → 1fr` technique so it stays smooth at any content height
 * without JS measurement (and collapses instantly under prefers-reduced-motion via the
 * global transition rule).
 */
export function Accordion({
  items,
  defaultOpenId = null,
  allowMultiple = false,
  className = '',
}: {
  items: AccordionItem[];
  /** Item open on mount; `null` starts fully collapsed. */
  defaultOpenId?: string | null;
  allowMultiple?: boolean;
  className?: string;
}) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(defaultOpenId ? [defaultOpenId] : []),
  );

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(allowMultiple ? current : current.has(id) ? [id] : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id} className="border-b hairline">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-[var(--color-ink)] transition-colors hover:text-[var(--color-ink-muted)]"
              >
                {item.label}
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-[var(--color-ink-muted)] transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="pb-5 text-sm text-[var(--color-ink-muted)]">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
