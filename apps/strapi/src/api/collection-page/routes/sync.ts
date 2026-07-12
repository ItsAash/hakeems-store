/**
 * Inbound webhook from Vendure's CollectionSyncPlugin (apps/vendure/src/plugins/collection-sync).
 * Authenticated by a shared secret header, not the users-permissions Public role,
 * so `auth: false` here just disables that unrelated gate — sync.ts itself checks
 * the secret before doing anything.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/collection-pages/sync',
      handler: 'collection-page.sync',
      config: {
        auth: false,
      },
    },
  ],
};
