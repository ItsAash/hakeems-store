import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { assertChannel } from '@/lib/channels';
import { getEventBySlug } from '@/lib/strapi';
import { getProductsByIds } from '@/lib/vendure';

export default async function EventPage({ params }: { params: Promise<{ channel: string; slug: string }> }) {
  const { channel: channelParam, slug } = await params;
  const channel = assertChannel(channelParam);
  const event = await getEventBySlug(channel, slug);

  if (!event) notFound();

  const vendureIds = event.featuredProducts?.map((product) => product.vendureId) || [];
  const products = await getProductsByIds(channel, vendureIds).catch(() => []);

  return (
    <main className="container section">
      <p className="eyebrow">{event.status}</p>
      <h1 style={{ margin: '10px 0 12px', fontSize: 'clamp(32px, 4.5vw, 56px)' }}>{event.title}</h1>
      <p className="muted">
        {new Date(event.eventDate).toLocaleDateString()} at {event.location}
      </p>
      <div style={{ marginTop: 20, maxWidth: 640, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: event.description || '' }} />

      {products.length > 0 && (
        <div className="section-head" style={{ marginTop: 48 }}>
          <h2>Featured Products</h2>
        </div>
      )}
      <div className="grid">
        {products.map((product) => (
          <ProductCard key={product.id} channel={channel} product={product} />
        ))}
      </div>
    </main>
  );
}
