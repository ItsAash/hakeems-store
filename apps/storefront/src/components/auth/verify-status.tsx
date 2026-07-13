'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { refreshCustomerVerificationAction, verifyCustomerAccountAction } from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';

export function VerifyStatus({ channelCode, token }: { channelCode: ChannelCode; token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    verifyCustomerAccountAction(channelCode, { token }).then((result) => {
      if (result.success) {
        setStatus('success');
        router.refresh();
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    });
    // Runs once on mount; the ref guard survives React Strict Mode's double-invoke in dev.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'pending') return <p className="text-sm text-[var(--color-ink-muted)]">Verifying your account…</p>;
  if (status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-ink)]">Your email is verified and you're signed in.</p>
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

export function ResendVerificationForm({ channelCode }: { channelCode: ChannelCode }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    await refreshCustomerVerificationAction(channelCode, email);
    setSent(true);
  };

  if (sent) {
    return (
      <p className="text-sm text-[var(--color-ink)]">
        If an unverified account exists for <span className="font-medium">{email}</span>, we've sent a new verification link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-[var(--color-ink-muted)]">Enter your email to resend the verification link.</p>
      <Field idPrefix="resend-verify" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Sending…' : 'Resend Verification Email'}
      </button>
    </form>
  );
}
