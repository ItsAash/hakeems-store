import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { CHANNELS, PRODUCT_TYPES, type ChannelCode, titleCase } from '@/lib/channels';
import { getHomeContent } from '@/lib/cms';

export async function Shell({ channel, children }: { channel: ChannelCode; children: React.ReactNode }) {
  const otherChannel = channel === 'nepal' ? 'hongkong' : 'nepal';
  const content = await getHomeContent(channel);
  const marqueeItems = [...content.announcements, ...content.announcements];

  return (
    <div className="site-shell">
      <div className="marquee">
        <div className="marquee-track">
          {marqueeItems.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </div>
      </div>
      <header className="header">
        <Link href={`/${channel}`} className="brand">
          Hakeems
        </Link>
        <nav className="nav-primary" aria-label="Primary navigation">
          {PRODUCT_TYPES.map((type) => (
            <Link key={type} href={`/${channel}/products/${type}`}>
              {titleCase(type)}
            </Link>
          ))}
          <Link href={`/${channel}/events/hakeems-pop-up`}>Events</Link>
        </nav>
        <div className="nav-actions">
          <Link href={`/${otherChannel}`}>{CHANNELS[otherChannel].name}</Link>
          <Link href={`/${channel}/cart`} aria-label="View cart">
            <ShoppingBag size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <p className="footer-brand">Hakeems</p>
            <p>Community streetwear designed in Kathmandu, worn in Nepal and Hong Kong.</p>
          </div>
          <div>
            <p className="footer-heading">Shop</p>
            <div className="footer-links">
              {PRODUCT_TYPES.map((type) => (
                <Link key={type} href={`/${channel}/products/${type}`}>
                  {titleCase(type)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="footer-heading">Explore</p>
            <div className="footer-links">
              <Link href={`/${channel}/events/hakeems-pop-up`}>Events</Link>
              <Link href={`/${channel}/cart`}>Cart</Link>
              <Link href={`/${otherChannel}`}>Shop {CHANNELS[otherChannel].name}</Link>
            </div>
          </div>
          <div>
            <p className="footer-heading">Markets</p>
            <div className="footer-links">
              <Link href="/nepal">Nepal · NPR</Link>
              <Link href="/hongkong">Hong Kong · HKD</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Hakeems. All prices include tax.</span>
          <span>{CHANNELS[channel].name}</span>
        </div>
      </footer>
    </div>
  );
}
