import type { Core } from '@strapi/strapi';
import { registerVendureSync } from './utils/vendure-sync';
import { setPublicPermissions } from './utils/set-public-permissions';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerVendureSync(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi);
  },
};
