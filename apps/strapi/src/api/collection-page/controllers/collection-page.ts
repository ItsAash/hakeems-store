import { factories } from '@strapi/strapi';

type SyncCollection = {
  vendureId?: string;
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
   * POST /api/collection-pages/sync — called by Vendure's CollectionSyncPlugin whenever a
   * collection is created, renamed, or deleted. One-way (Vendure -> Strapi) and
   * secret-header authenticated: Vendure owns which collections exist and which channel(s)
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
    const results: Array<{ vendureId: string; status: string }> = [];

    for (const collection of collections) {
      if (!collection.vendureId) continue;

      const existing = await strapi.documents(UID).findFirst({
        filters: { vendureId: collection.vendureId },
        status: 'draft',
      });

      if (action === 'delete') {
        if (existing) {
          await strapi.documents(UID).delete({ documentId: existing.documentId });
          results.push({ vendureId: collection.vendureId, status: 'deleted' });
        } else {
          results.push({ vendureId: collection.vendureId, status: 'ignored' });
        }
        continue;
      }

      if (existing) {
        // Only the slug is kept in sync on every touch — it must always match Vendure's
        // real current slug for storefront routing to work. `title` is deliberately left
        // alone here: it's editorial marketing copy (e.g. "New Drop · SS26" vs. Vendure's
        // internal "new-drop"), not something Vendure's raw collection name should clobber.
        await strapi.documents(UID).update({
          documentId: existing.documentId,
          data: { vendureCollectionSlug: collection.slug },
        });
        results.push({ vendureId: collection.vendureId, status: 'updated' });
      } else {
        const created = await strapi.documents(UID).create({
          data: {
            vendureId: collection.vendureId,
            vendureCollectionSlug: collection.slug || collection.vendureId,
            title: collection.name || collection.slug || collection.vendureId,
          },
        });
        await strapi.documents(UID).publish({ documentId: created.documentId });
        results.push({ vendureId: collection.vendureId, status: 'created' });
      }
    }

    ctx.body = { ok: true, status: 'synced', results };
  },
}));
