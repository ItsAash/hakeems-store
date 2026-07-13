import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { LogoutButton } from '@/components/account/logout-button';

const LINKS = [
  { href: '', label: 'Profile' },
  { href: '/addresses', label: 'Addresses' },
  { href: '/orders', label: 'Order History' },
];

export function AccountNav({ channelCode }: { channelCode: ChannelCode }) {
  return (
    <nav className="flex flex-row gap-6 border-b hairline pb-4 text-sm md:w-40 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-6">
      {LINKS.map((link) => (
        <Link
          key={link.label}
          href={`/${channelCode}/account${link.href}`}
          className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          {link.label}
        </Link>
      ))}
      <LogoutButton channelCode={channelCode} />
    </nav>
  );
}
