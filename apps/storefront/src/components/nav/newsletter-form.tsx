'use client';

import { useState } from 'react';

/**
 * Newsletter sign-up form. All copy (placeholder, button label, success message) is passed
 * in from Strapi by the server `Footer` — this component owns only the interaction. There is
 * no ESP wired up yet, so submit validates the address client-side and shows the editor's
 * success message; swap `onSubmit` for a real subscribe endpoint when one exists.
 */
export function NewsletterForm({
  placeholder,
  buttonLabel,
  successMessage,
}: {
  placeholder: string;
  buttonLabel: string;
  successMessage: string;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'done'>('idle');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    // TODO: POST to a real subscription endpoint / ESP. For now, acknowledge locally.
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <p className="text-sm text-[var(--color-paper)]/80" role="status" aria-live="polite">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <div className="flex items-center border-b border-[var(--color-paper)]/25 focus-within:border-[var(--color-paper)] transition-colors duration-300">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder={placeholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === 'error') setStatus('idle');
          }}
          className="w-full bg-transparent py-2.5 pr-3 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper)]/40 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 whitespace-nowrap py-2.5 text-xs font-medium tracking-[0.14em] text-[var(--color-paper)]/75 uppercase transition-colors duration-300 hover:text-[var(--color-accent)]"
        >
          {buttonLabel}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-xs text-[var(--color-paper)]/60" role="alert">
          Please enter a valid email address.
        </p>
      )}
    </form>
  );
}
