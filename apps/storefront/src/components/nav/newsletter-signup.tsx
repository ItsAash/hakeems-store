'use client';

import { useState } from 'react';
import { subscribeToNewsletterAction } from '@/lib/newsletter/actions';
import { ArrowRightIcon, CheckIcon } from '@/components/ui/icons';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Minimal underline-style email capture for the footer. Wired to a real Server Action
 * (subscribeToNewsletterAction) that validates the address and returns an inline result —
 * no page navigation, no client cart/store to sync.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    const result = await subscribeToNewsletterAction(email);
    setMessage(result.message);
    if (result.success) {
      setStatus('success');
      setEmail('');
    } else {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <div className="flex items-center border-b border-[var(--color-paper)]/25 transition-colors duration-300 focus-within:border-[var(--color-paper)]/70">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="Email address"
          aria-label="Email address"
          className="w-full bg-transparent py-3 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper)]/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          aria-label="Subscribe"
          className="shrink-0 p-2 text-[var(--color-paper)]/70 transition-all duration-300 hover:translate-x-0.5 hover:text-[var(--color-paper)] disabled:opacity-50"
        >
          {status === 'success' ? <CheckIcon className="h-5 w-5" /> : <ArrowRightIcon className="h-5 w-5" />}
        </button>
      </div>
      {message && (
        <p
          className={`mt-3 text-xs ${status === 'error' ? 'text-[var(--color-accent)]' : 'text-[var(--color-paper)]/60'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
