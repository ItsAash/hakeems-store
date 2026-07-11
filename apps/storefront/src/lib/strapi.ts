import type { ChannelCode } from './channels';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export type StrapiEvent = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  eventDate: string;
  location: string;
  channel: ChannelCode | 'both';
  status: 'upcoming' | 'live' | 'ended';
  featuredProducts?: Array<{
    id: number;
    documentId: string;
    vendureId: string;
    title: string;
    handle: string;
  }>;
};

export async function getEventBySlug(channel: ChannelCode, slug: string) {
  const url = new URL('/api/events', STRAPI_URL);
  url.searchParams.set('filters[slug][$eq]', slug);
  url.searchParams.set('filters[channel][$in][0]', channel);
  url.searchParams.set('filters[channel][$in][1]', 'both');
  url.searchParams.set('populate[featuredProducts]', 'true');

  const response = await fetch(url, {
    headers: STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {},
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Strapi request failed ${response.status}`);
  }

  const json = (await response.json()) as { data: StrapiEvent[] };
  return json.data[0] || null;
}
