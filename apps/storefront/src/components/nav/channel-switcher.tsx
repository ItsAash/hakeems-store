'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHANNEL_CODES, CHANNELS, type ChannelCode } from '@/lib/channel';

/** Swaps the leading `/{channel}` path segment for the target channel, preserving the
 * rest of the URL (e.g. `/nepal/products/foo` → `/hongkong/products/foo`) so switching
 * stores doesn't strand the visitor back at the homepage. */
function pathForChannel(pathname: string, currentChannel: ChannelCode, targetChannel: ChannelCode): string {
  const rest = pathname.startsWith(`/${currentChannel}`) ? pathname.slice(`/${currentChannel}`.length) : '';
  return `/${targetChannel}${rest}`;
}

export function ChannelSwitcher({ channelCode }: { channelCode: ChannelCode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1.5 tracking-wide text-[var(--color-paper)]/45 transition-colors hover:text-[var(--color-paper)]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>Store: {CHANNELS[channelCode].countryName}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close store switcher"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <ul
            role="listbox"
            className="absolute bottom-full right-0 z-20 mb-2 min-w-36 border border-[var(--color-paper)]/15 bg-[var(--color-ink)] py-1 shadow-lg md:right-0 md:left-auto"
          >
            {CHANNEL_CODES.map((code) => (
              <li key={code}>
                <Link
                  href={pathForChannel(pathname, channelCode, code)}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                    code === channelCode
                      ? 'text-[var(--color-paper)]'
                      : 'text-[var(--color-paper)]/60 hover:text-[var(--color-paper)]'
                  }`}
                >
                  {CHANNELS[code].countryName} ({CHANNELS[code].currencyCode})
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
