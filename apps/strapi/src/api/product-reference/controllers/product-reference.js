"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const CONTENT_TYPE = 'api::product-reference.product-reference';
const SECRET_HEADER = 'x-hakeems-sync-secret';
const assertSharedSecret = (ctx) => {
    const expected = strapi.config.get('server.env.HAKEEMS_SYNC_SECRET') || process.env.HAKEEMS_SYNC_SECRET;
    const actual = ctx.request.headers[SECRET_HEADER];
    if (!expected || actual !== expected) {
        ctx.throw(401, 'Invalid sync secret');
    }
};
const findByVendureId = async (vendureId) => {
    const results = await strapi.documents(CONTENT_TYPE).findMany({
        filters: { vendureId: { $eq: vendureId } },
        limit: 1,
    });
    return results[0];
};
exports.default = strapi_1.factories.createCoreController(CONTENT_TYPE, ({ strapi }) => ({
    async sync(ctx) {
        assertSharedSecret(ctx);
        const { action, products } = ctx.request.body;
        if (!['upsert', 'delete'].includes(action) || !Array.isArray(products)) {
            ctx.throw(400, 'Expected action upsert/delete and products array');
        }
        const results = [];
        for (const product of products) {
            if (!product.vendureId) {
                results.push({ vendureId: null, status: 'skipped', reason: 'missing vendureId' });
                continue;
            }
            const existing = await findByVendureId(product.vendureId);
            if (action === 'delete') {
                if (existing?.documentId) {
                    await strapi.documents(CONTENT_TYPE).delete({ documentId: existing.documentId });
                }
                results.push({ vendureId: product.vendureId, status: existing ? 'deleted' : 'not_found' });
                continue;
            }
            const data = {
                vendureId: product.vendureId,
                title: product.title || product.vendureId,
                handle: product.handle || product.vendureId,
                thumbnailUrl: product.thumbnailUrl || null,
                channel: product.channel || 'both',
                syncedAt: new Date().toISOString(),
            };
            if (existing?.documentId) {
                await strapi.documents(CONTENT_TYPE).update({
                    documentId: existing.documentId,
                    data,
                });
                results.push({ vendureId: product.vendureId, status: 'updated' });
            }
            else {
                await strapi.documents(CONTENT_TYPE).create({ data });
                results.push({ vendureId: product.vendureId, status: 'created' });
            }
        }
        ctx.body = { ok: true, results };
    },
}));
