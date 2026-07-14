'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { resetPasswordAction } from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';

export function PasswordResetForm({ channelCode, token }: { channelCode: ChannelCode; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await resetPasswordAction(channelCode, { token, password });
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.push(routes.account(channelCode));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        idPrefix="reset"
        label="New password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Set New Password'}
      </button>
    </form>
  );
}
