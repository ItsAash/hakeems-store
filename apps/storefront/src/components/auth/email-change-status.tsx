'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { updateCustomerEmailAddressAction } from '@/lib/vendure/auth-actions';

export function EmailChangeStatus({ channelCode, token }: { channelCode: ChannelCode; token: string }) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    updateCustomerEmailAddressAction(channelCode, token).then((result) => {
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'pending') return <p className="text-sm text-[var(--color-ink-muted)]">Confirming your new email address…</p>;
  if (status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-ink)]">Your email address has been updated.</p>
        <a
          href={`/${channelCode}/account`}
          className="border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70 self-start"
        >
          Go to your account
        </a>
      </div>
    );
  }
  return <p className="text-sm text-red-600">{message}</p>;
}
