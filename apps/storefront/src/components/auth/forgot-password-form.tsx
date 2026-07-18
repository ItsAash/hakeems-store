'use client';

import { useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { requestPasswordResetAction } from '@/lib/medusa/auth-actions';
import { Field } from '@/components/ui/field';

export function ForgotPasswordForm({ channelCode }: { channelCode: ChannelCode }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    await requestPasswordResetAction(channelCode, email);
    setSent(true);
  };

  if (sent) {
    return (
      <p className="text-sm text-[var(--color-ink)]">
        If an account exists for <span className="font-medium">{email}</span>, we've sent a password reset link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field idPrefix="forgot" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Sending…' : 'Send Reset Link'}
      </button>
    </form>
  );
}
