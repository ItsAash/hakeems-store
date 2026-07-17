import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  // Media URLs are served from the CDN gateway (public-buckets template) when configured,
  // otherwise fall back to the raw S3 endpoint host (virtual-host style: bucket.endpoint).
  const cdnBaseUrl = env('S3_CDN_BASE_URL');
  const s3Endpoint = env('S3_ENDPOINT');
  const s3MediaHost = cdnBaseUrl
    ? new URL(cdnBaseUrl).host
    : s3Endpoint
      ? new URL(s3Endpoint).host
      : undefined;

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': [
              "'self'",
              'data:',
              'blob:',
              'market-assets.strapi.io',
              ...(s3MediaHost ? [s3MediaHost, `*.${s3MediaHost}`] : []),
            ],
            'media-src': [
              "'self'",
              'data:',
              'blob:',
              'market-assets.strapi.io',
              ...(s3MediaHost ? [s3MediaHost, `*.${s3MediaHost}`] : []),
            ],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
