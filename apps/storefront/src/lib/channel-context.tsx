'use client';

import { createContext, useContext } from 'react';
import type { ChannelDefinition } from '@/lib/channel';

const ChannelContext = createContext<ChannelDefinition | null>(null);

/**
 * Populated once, server-side, by app/[channel]/layout.tsx and never re-derived on
 * the client — this is what keeps currency/copy from flashing between channels on
 * first paint (see STOREFRONT_PLAN.md §3.1).
 */
export function ChannelProvider({
  channel,
  children,
}: {
  channel: ChannelDefinition;
  children: React.ReactNode;
}) {
  return <ChannelContext.Provider value={channel}>{children}</ChannelContext.Provider>;
}

export function useChannel(): ChannelDefinition {
  const channel = useContext(ChannelContext);
  if (!channel) {
    throw new Error('useChannel() must be used within a ChannelProvider');
  }
  return channel;
}
