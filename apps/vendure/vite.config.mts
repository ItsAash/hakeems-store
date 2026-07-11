import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dashboard',
  build: {
    outDir: join(__dirname, 'dist/dashboard'),
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
      api:
        process.env.NODE_ENV === 'production'
          ? { host: 'auto', port: 'auto' }
          : { host: 'http://localhost', port: 3000 },
      gqlOutputPath: './src/gql',
    }),
  ],
  resolve: {
    alias: {
      '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
      'react-dom/client': resolve(__dirname, './node_modules/react-dom/client'),
      'react/jsx-dev-runtime': resolve(__dirname, './node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': resolve(__dirname, './node_modules/react/jsx-runtime.js'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
  },
});
