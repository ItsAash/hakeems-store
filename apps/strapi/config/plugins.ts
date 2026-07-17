import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const s3Bucket = env('S3_BUCKET');

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        // Falls back to local disk storage when S3_BUCKET isn't set.
        ...(s3Bucket
          ? {
              provider: 'aws-s3',
              providerOptions: {
                baseUrl: env('S3_CDN_BASE_URL'),
                s3Options: {
                  credentials: {
                    accessKeyId: env('S3_ACCESS_KEY_ID'),
                    secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
                  },
                  region: env('S3_REGION'),
                  endpoint: env('S3_ENDPOINT'),
                  forcePathStyle: env.bool('S3_FORCE_PATH_STYLE', false),
                  params: {
                    // Omit ACL entirely: Railway/Tigris (like Cloudflare R2) doesn't support ACLs.
                    ACL: undefined,
                    Bucket: s3Bucket,
                  },
                },
              },
              actionOptions: {
                upload: {},
                uploadStream: {},
                delete: {},
              },
            }
          : {}),
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },
      },
    },
  };
};

export default config;
