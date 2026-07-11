import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { CHANNELS, PRODUCT_TYPES, type ChannelCode, titleCase } from '@/lib/channels';

export function Shell({ channel, children }: { channel: ChannelCode; children: React.ReactNode }) {
  const otherChannel = channel === 'nepal' ? 'hongkong' : 'nepal';

  return (
    <div className="site-shell">
      <header className="header">
        <Link href={`/${channel}`} className="brand">
          Hakeems
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          {PRODUCT_TYPES.map((type) => (
            <Link key={type} href={`/${channel}/products/${type}`}>
              {titleCase(type)}
            </Link>
          ))}
          <Link href={`/${channel}/events/hakeems-pop-up`}>Events</Link>
          <Link href={`/${otherChannel}`}>{CHANNELS[otherChannel].name}</Link>
          <Link href={`/${channel}/cart`} aria-label="Cart">
            <ShoppingBag size={18} />
          </Link>
        </nav>
      </header>
      {children}
      <footer className="footer">Hakeems {CHANNELS[channel].name}. Prices are tax-inclusive.</footer>
    </div>
  );
}
