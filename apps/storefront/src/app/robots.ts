import type { MetadataRoute } from 'next';
import { CHANNEL_CODES } from '@/lib/channel';
import { SITE_URL, absoluteUrl } from '@/lib/seo/site';

/** Private/transactional segments that must never be indexed (per channel). */
const PRIVATE_SEGMENTS = [
  'account',
  'cart',
  'checkout',
  'login',
  'register',
  'forgot-password',
  'password-reset',
  'search',
];

export default function robots(): MetadataRoute.Robots {
  const disallow = CHANNEL_CODES.flatMap((channel) => PRIVATE_SEGMENTS.map((segment) => `/${channel}/${segment}`));
  return {
    rules: { userAgent: '*', allow: '/', disallow },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
