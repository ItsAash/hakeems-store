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
          <span className="font-serif text-lg text-[var(--color-ink)]">Lopho</span>
          <button type="button" onClick={close} aria-label="Close menu" className="relative after:absolute after:-inset-3">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {/* Editorial menu list: oversized serif entries with breathing room — designed for
            the thumb, not a shrunken desktop nav. */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {items.map((item) => {
            const hasChildren = item.children.length > 0;
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="border-b hairline">
                <div className="flex items-center justify-between py-5">
                  <Link
                    href={withChannel(channelCode, item.href)}
                    onClick={close}
                    className="font-serif text-2xl text-[var(--color-ink)]"
                  >
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      aria-label={`Toggle ${item.label} submenu`}
                      aria-expanded={isExpanded}
                      className="p-2 text-[var(--color-ink-muted)]"
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
                {hasChildren && (
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-4 pb-6 pl-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={withChannel(channelCode, child.href)}
                            onClick={close}
                            className="text-sm tracking-label text-[var(--color-ink-muted)] uppercase transition-colors duration-200 hover:text-[var(--color-ink)]"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
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
