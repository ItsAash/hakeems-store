import { factories } from '@strapi/strapi';

type SyncChannel = 'nepal' | 'hongkong' | 'both';

type SyncProduct = {
  vendureId?: string;
  title?: string;
  handle?: string;
  thumbnailUrl?: string | null;
  channel?: SyncChannel;
};

type SyncPayload = {
  action?: 'upsert' | 'delete';
  products?: SyncProduct[];
};

const UID = 'api::product-reference.product-reference' as const;

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * POST /api/product-references/sync — called by Vendure's StrapiSyncPlugin on every
   * product create/update/delete. Upserts by vendureId, preserving any editorial fields
   * (enrichedDescription, seo) a human has already written. Newly-created references are
   * auto-published so they show up immediately for editors without an extra manual step.
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
    const products = Array.isArray(payload?.products) ? payload.products : [];

    if (products.length === 0) {
      ctx.body = { ok: true, status: 'noop', results: [] };
      return;
    }

    const action = payload.action === 'delete' ? 'delete' : 'upsert';
    const results: Array<{ vendureId: string; status: string }> = [];

    for (const product of products) {
      if (!product.vendureId) continue;

      const existing = await strapi.documents(UID).findFirst({
        filters: { vendureId: product.vendureId },
        status: 'draft',
      });

      if (action === 'delete') {
        if (existing) {
          await strapi.documents(UID).delete({ documentId: existing.documentId });
          results.push({ vendureId: product.vendureId, status: 'deleted' });
        } else {
          results.push({ vendureId: product.vendureId, status: 'ignored' });
        }
        continue;
      }

      if (existing) {
        // Only the draft is touched here, deliberately: these are Vendure-owned reference
        // fields (title/handle/thumbnail), not editorial content. Re-publishing on every
        // Vendure product touch would prematurely publish whatever in-progress
        // enrichedDescription/SEO an editor is still drafting on the same document. The
        // published snapshot of these fields catches up next time an editor publishes.
        await strapi.documents(UID).update({
          documentId: existing.documentId,
          data: {
            title: product.title,
            handle: product.handle,
            thumbnailUrl: product.thumbnailUrl || undefined,
            channel: product.channel,
          },
        });
        results.push({ vendureId: product.vendureId, status: 'updated' });
      } else {
        const created = await strapi.documents(UID).create({
          data: {
            vendureId: product.vendureId,
            title: product.title || product.vendureId,
            handle: product.handle || product.vendureId,
            thumbnailUrl: product.thumbnailUrl || undefined,
            channel: product.channel || 'both',
          },
        });
        await strapi.documents(UID).publish({ documentId: created.documentId });
        results.push({ vendureId: product.vendureId, status: 'created' });
      }
    }

    ctx.body = { ok: true, status: 'synced', results };
  },
}));
