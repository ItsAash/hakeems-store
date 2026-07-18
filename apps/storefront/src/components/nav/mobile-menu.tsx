'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { NavItem } from '@/lib/strapi/types';
import { withChannel } from '@/lib/channel';
import { ChevronDownIcon, CloseIcon, MenuIcon } from '@/components/ui/icons';
import { Overlay } from '@/components/ui/overlay';

export function MobileMenu({ items, channelCode }: { items: NavItem[]; channelCode: ChannelCode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const close = () => {
    setIsOpen(false);
    setExpandedId(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="relative text-[var(--nav-fg)] after:absolute after:-inset-3 md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <Overlay
        open={isOpen}
        onClose={close}
        label="Menu"
        panelClassName="absolute inset-y-0 left-0 flex w-full flex-col bg-[var(--color-paper-raised)]"
        panelClosedClassName="-translate-x-full"
        panelOpenClassName="translate-x-0"
      >
        <div className="flex items-center justify-between border-b hairline px-6 py-5">
          <span className="font-serif text-lg text-[var(--color-ink)]">Hakeems</span>
          <button type="button" onClick={close} aria-label="Close menu" className="relative after:absolute after:-inset-3">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
              {items.map((item) => {
                const hasChildren = item.children.length > 0;
                const isExpanded = expandedId === item.id;
                return (
                  <div key={item.id} className="border-b hairline">
                    <div className="flex items-center justify-between py-4">
                      <Link href={withChannel(channelCode, item.href)} onClick={close} className="text-base text-[var(--color-ink)]">
                        {item.label}
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          aria-label={`Toggle ${item.label} submenu`}
                          className="p-2 text-[var(--color-ink-muted)]"
                        >
                          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {hasChildren && isExpanded && (
                      <div className="flex flex-col gap-3 pb-4 pl-4">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={withChannel(channelCode, child.href)}
                            onClick={close}
                            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
        </nav>
      </Overlay>
    </>
  );
}
