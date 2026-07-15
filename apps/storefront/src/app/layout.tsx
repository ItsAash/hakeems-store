import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { getSiteSetting } from '@/lib/strapi/queries';
import { resolveMediaUrl } from '@/lib/strapi/client';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
});

/**
 * Site-wide metadata defaults, driven by Strapi's site-setting (name + default SEO). Every
 * page inherits `metadataBase` (for absolute URLs) and the title template; pages override
 * title/description/canonical via their own generateMetadata + buildMetadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const setting = await getSiteSetting();
  const siteName = setting?.siteName || SITE_NAME;
  const description = setting?.defaultSeo?.metaDescription || setting?.tagline || undefined;
  const defaultTitle = setting?.defaultSeo?.metaTitle || siteName;
  const ogImage = setting?.defaultSeo?.ogImage ? resolveMediaUrl(setting.defaultSeo.ogImage.url) : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: defaultTitle, template: `%s · ${siteName}` },
    description,
    applicationName: siteName,
    openGraph: {
      type: 'website',
      siteName,
      title: defaultTitle,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: defaultTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      {/* Browser extensions (e.g. Bitdefender's `bis_register`/`__processed_*`) inject
          attributes onto <body> before React hydrates, which trips the hydration-mismatch
          warning. suppressHydrationWarning ignores attribute diffs on this one element only. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
