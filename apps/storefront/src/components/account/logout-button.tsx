import type { ChannelCode } from '@/lib/channel';
import { logoutAction } from '@/lib/medusa/auth-actions';

export function LogoutButton({ channelCode }: { channelCode: ChannelCode }) {
  return (
    <form action={logoutAction.bind(null, channelCode)}>
      <button type="submit" className="text-left text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        Sign Out
      </button>
    </form>
  );
}
