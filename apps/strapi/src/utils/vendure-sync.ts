import type { Core } from '@strapi/strapi';

const PRODUCT_REFERENCE_UID = 'api::product-reference.product-reference' as const;

/**
 * Pushes a published product-reference's editorial fields back into Vendure's
 * Product custom fields (enrichedDescription/seoTitle/seoDescription), mirroring
 * the shape apps/vendure/src/plugins/strapi-sync/strapi-sync.plugin.ts expects
 * on its `POST /webhooks/strapi` controller.
 */
export async function pushProductReferenceToVendure(strapi: Core.Strapi, documentId: string) {
  const url = process.env.VENDURE_SYNC_URL;
  const secret = process.env.HAKEEMS_SYNC_SECRET;
  if (!url || !secret) {
    strapi.log.debug('VENDURE_SYNC_URL/HAKEEMS_SYNC_SECRET not set — skipping reverse sync to Vendure.');
    return;
  }

  const entry = await strapi.documents(PRODUCT_REFERENCE_UID).findOne({
    documentId,
    status: 'published',
    populate: ['seo'],
  });
  if (!entry) return;

  const seo = entry.seo as { metaTitle?: string; metaDescription?: string } | null;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hakeems-Sync-Secret': secret,
    },
    body: JSON.stringify({
      event: 'entry.publish',
      entry: {
        vendureId: entry.vendureId,
        enrichedDescription: entry.enrichedDescription || '',
        seoTitle: seo?.metaTitle || '',
        seoDescription: seo?.metaDescription || '',
      },
    }),
  });

  if (!response.ok) {
    strapi.log.warn(`Vendure reverse sync failed for product-reference ${documentId}: ${response.status} ${await response.text()}`);
  }
}

/**
 * Registers a Document Service middleware that fires the reverse sync whenever a
 * product-reference is published (first publish or republish after edits).
 */
export function registerVendureSync(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx, next) => {
    const result = await next();

    if (ctx.uid === PRODUCT_REFERENCE_UID && ctx.action === 'publish') {
      const documentId = (ctx.params as { documentId?: string }).documentId;
      if (documentId) {
        pushProductReferenceToVendure(strapi, documentId).catch((error: Error) => {
          strapi.log.warn(`Vendure reverse sync error: ${error.message}`);
        });
      }
    }

    return result;
  });
}
