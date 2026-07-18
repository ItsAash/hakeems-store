'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { registerAction } from '@/lib/medusa/auth-actions';
import { Field } from '@/components/ui/field';

export function RegisterForm({ channelCode }: { channelCode: ChannelCode }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', emailAddress: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await registerAction(channelCode, {
      email: form.emailAddress,
      password: form.password,
      first_name: form.firstName,
      last_name: form.lastName,
    });
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setSubmittedEmail(form.emailAddress);
  };

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-ink)]">
          We sent a verification link to <span className="font-medium">{submittedEmail}</span>. Follow it to activate your
          account.
        </p>
        <Link
          href={routes.login(channelCode)}
          className="border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70 self-start"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field idPrefix="register" label="First name" required value={form.firstName} onChange={setField('firstName')} autoComplete="given-name" />
        <Field idPrefix="register" label="Last name" required value={form.lastName} onChange={setField('lastName')} autoComplete="family-name" />
      </div>
      <Field
        idPrefix="register"
        label="Email"
        type="email"
        required
        value={form.emailAddress}
        onChange={setField('emailAddress')}
        autoComplete="email"
      />
      <Field
        idPrefix="register"
        label="Password"
        type="password"
        required
        value={form.password}
        onChange={setField('password')}
        autoComplete="new-password"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-label text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Already have an account?{' '}
        <Link href={routes.login(channelCode)} className="text-[var(--color-ink)] underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
