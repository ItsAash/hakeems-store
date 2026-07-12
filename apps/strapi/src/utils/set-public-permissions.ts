import type { Core } from '@strapi/strapi';

/** Content the storefront reads directly over the public REST/GraphQL content API. */
const PUBLIC_READ_ACTIONS: Record<string, string[]> = {
  'api::home-page.home-page': ['find', 'findOne'],
  'api::collection-page.collection-page': ['find', 'findOne'],
  'api::site-setting.site-setting': ['find'],
};

/**
 * Grants read-only Public role access to the given actions, skipping any that are
 * already granted so this can safely run on every boot.
 */
export async function setPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('Public role not found — skipping permission bootstrap.');
    return;
  }

  for (const [uid, controllerActions] of Object.entries(PUBLIC_READ_ACTIONS)) {
    // Content-API action ids are `${api}.${controller}.${action}`, and for a standard
    // core-generated controller `${api}.${controller}` is exactly the content-type uid
    // itself (e.g. "api::home-page.home-page") — so no extra segment is needed here.
    for (const action of controllerActions) {
      const actionId = `${uid}.${action}`;

      const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: { action: actionId, role: publicRole.id },
      });
      if (existing) continue;

      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action: actionId, role: publicRole.id },
      });
      strapi.log.info(`Granted public access: ${actionId}`);
    }
  }
}
