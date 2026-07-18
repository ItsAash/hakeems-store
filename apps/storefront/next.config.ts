import type { NextConfig } from 'next';

const assetHost = process.env.NEXT_PUBLIC_VENDURE_ASSET_HOST;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/assets/**' },
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/static/**' },
      { protocol: 'http', hostname: 'localhost', port: '1337', pathname: '/uploads/**' },
      ...(assetHost ? [{ protocol: 'https' as const, hostname: assetHost, pathname: '/**' }] : []),
    ],
    unoptimized: true,
  },
};

export default nextConfig;
