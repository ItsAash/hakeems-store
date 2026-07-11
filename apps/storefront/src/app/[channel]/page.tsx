import Link from 'next/link';
import { assertChannel, CHANNELS } from '@/lib/channels';
import { getHomeContent } from '@/lib/cms';
import { getProducts } from '@/lib/vendure';
import { ProductCard } from '@/components/ProductCard';

const TILE_BACKGROUNDS: Record<string, string> = {
  tops: 'linear-gradient(160deg, #2b2822, #59493c)',
  bottoms: 'linear-gradient(160deg, #26241f, #4a4038)',
  accessories: 'linear-gradient(160deg, #33261f, #a8442f)',
};

export default async function ChannelHome({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  const channel = assertChannel(channelParam);
  const [content, products] = await Promise.all([getHomeContent(channel), getProducts(channel).catch(() => [])]);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>{content.hero.heading}</h1>
          <p>{content.hero.subheading}</p>
          <Link className="button inverse" href={content.hero.ctaHref}>
            {content.hero.ctaLabel}
          </Link>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>Shop by Category</h2>
          </div>
          <div className="tile-grid">
            {content.categoryTiles.map((tile) => (
              <Link
                className="tile"
                key={tile.type}
                href={`/${channel}/products/${tile.type}`}
                style={{ ['--tile-bg' as string]: TILE_BACKGROUNDS[tile.type] }}
              >
                <h3>{tile.label}</h3>
                <p>{tile.tagline}</p>
              </Link>
            ))}
          </div>
        </section>

        {products.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>New Arrivals</h2>
              <Link className="text-link" href={`/${channel}/products/tops`}>
                View All
              </Link>
            </div>
            <div className="grid">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} channel={channel} product={product} />
              ))}
            </div>
          </section>
        )}

        <section className="section story">
          <div className="story-media" aria-hidden="true" />
          <div className="story-copy">
            <p className="eyebrow">{content.story.eyebrow}</p>
            <h2>{content.story.heading}</h2>
            {content.story.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
