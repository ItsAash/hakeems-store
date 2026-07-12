/**
 * Inbound webhook from Vendure's StrapiSyncPlugin (apps/vendure/src/plugins/strapi-sync).
 * Authenticated by a shared secret header, not the users-permissions Public role,
 * so `auth: false` here just disables that unrelated gate — sync.ts itself checks
 * the secret before doing anything.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/product-references/sync',
      handler: 'product-reference.sync',
      config: {
        auth: false,
      },
    },
  ],
};
