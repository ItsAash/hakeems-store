import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { getSiteSetting } from '@/lib/strapi/queries';
import { resolveMediaUrl } from '@/lib/strapi/client';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import { CHANNELS, CHANNEL_CODES } from '@/lib/channel';
import { IntroOverlay } from '@/components/motion/intro-overlay';
import './globals.css';

/**
 * Decides the brand intro's visibility BEFORE first paint (motion layer 1): 'play' only
 * on the first visit of this browser session with no reduced-motion preference. Runs as a
 * parser-blocking inline script so returning visitors never glimpse the overlay and first
 * visitors see it from frame 0. Any failure defaults to 'done' — the safe state.
 */
const INTRO_GATE_SCRIPT = `(function(){try{var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var seen=window.sessionStorage.getItem('hakeems-intro-seen');document.documentElement.dataset.intro=(reduce||seen)?'done':'play'}catch(e){document.documentElement.dataset.intro='done'}})()`;

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const setting = await getSiteSetting();
  const brandName = setting?.siteName || SITE_NAME;
  // The house's markets, from the app-level channel config — not hardcoded copy.
  const eyebrow = CHANNEL_CODES.map((code) => CHANNELS[code].countryName).join(' · ');

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
        <IntroOverlay brandName={brandName} eyebrow={eyebrow} />
        {children}
      </body>
    </html>
  );
}
