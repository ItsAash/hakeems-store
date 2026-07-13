import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api',
  documents: ['src/lib/vendure/queries/**/*.graphql'],
  config: {
    scalars: { Money: 'number', DateTime: 'string' },
  },
  generates: {
    'src/lib/vendure/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
    },
  },
};

export default config;
