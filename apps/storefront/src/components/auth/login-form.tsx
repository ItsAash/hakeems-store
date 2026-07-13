'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { loginAction } from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';

export function LoginForm({ channelCode, next }: { channelCode: ChannelCode; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await loginAction(channelCode, { username: email, password, rememberMe });
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field idPrefix="login" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Field
        idPrefix="login"
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[var(--color-ink-muted)]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-[var(--color-ink)]"
          />
          Remember me
        </label>
        <Link href={`/${channelCode}/forgot-password`} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
          Forgot password?
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}{' '}
          <Link href={`/${channelCode}/verify`} className="underline underline-offset-2">
            Resend verification email?
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        New here?{' '}
        <Link href={`/${channelCode}/register`} className="text-[var(--color-ink)] underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
