import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
    // Vendure's asset server runs on localhost in dev. Next's image optimizer
    // otherwise refuses (SSRF protection) to fetch anything resolving to a
    // private/loopback IP. Safe here since this only ever points at our own
    // Vendure instance, configured via VENDURE_SHOP_API_URL.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
