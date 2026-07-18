import { factories } from '@strapi/strapi';

type SyncCollection = {
  medusaCollectionId?: string;
  name?: string;
  slug?: string;
};

type SyncPayload = {
  action?: 'upsert' | 'delete';
  collections?: SyncCollection[];
};

const UID = 'api::collection-page.collection-page' as const;

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * POST /api/collection-pages/sync — called by Medusa's collection-sync subscriber whenever
   * a product collection is created, renamed, or deleted. One-way (Medusa -> Strapi) and
   * secret-header authenticated: Medusa owns which collections exist and which channel(s)
   * they sell in, Strapi only owns presentation (banner, tagline, description, featured).
   */
  async sync(ctx) {
    const secret = ctx.request.headers['x-hakeems-sync-secret'];
    const expected = process.env.HAKEEMS_SYNC_SECRET;

    if (!expected || secret !== expected) {
      ctx.status = 401;
      ctx.body = { ok: false, status: 'unauthorized' };
      return;
    }

    const payload = ctx.request.body as SyncPayload;
    const collections = Array.isArray(payload?.collections) ? payload.collections : [];

    if (collections.length === 0) {
      ctx.body = { ok: true, status: 'noop', results: [] };
      return;
    }

    const action = payload.action === 'delete' ? 'delete' : 'upsert';
    const results: Array<{ medusaCollectionId: string; status: string }> = [];

    for (const collection of collections) {
      if (!collection.medusaCollectionId) continue;

      const existing = await strapi.documents(UID).findFirst({
        filters: { medusaCollectionId: collection.medusaCollectionId },
        status: 'draft',
      });

      if (action === 'delete') {
        if (existing) {
          await strapi.documents(UID).delete({ documentId: existing.documentId });
          results.push({ medusaCollectionId: collection.medusaCollectionId, status: 'deleted' });
        } else {
          results.push({ medusaCollectionId: collection.medusaCollectionId, status: 'ignored' });
        }
        continue;
      }

      if (existing) {
        // Only the slug is kept in sync on every touch — it must always match Medusa's
        // real current handle for storefront routing to work. `title` is deliberately left
        // alone here: it's editorial marketing copy (e.g. "New Drop · SS26" vs. Medusa's
        // internal "new-drop"), not something Medusa's raw collection title should clobber.
        await strapi.documents(UID).update({
          documentId: existing.documentId,
          data: { collectionSlug: collection.slug },
        });
        results.push({ medusaCollectionId: collection.medusaCollectionId, status: 'updated' });
      } else {
        const created = await strapi.documents(UID).create({
          data: {
            medusaCollectionId: collection.medusaCollectionId,
            collectionSlug: collection.slug || collection.medusaCollectionId,
            title: collection.name || collection.slug || collection.medusaCollectionId,
          },
        });
        await strapi.documents(UID).publish({ documentId: created.documentId });
        results.push({ medusaCollectionId: collection.medusaCollectionId, status: 'created' });
      }
    }

    ctx.body = { ok: true, status: 'synced', results };
  },
}));
