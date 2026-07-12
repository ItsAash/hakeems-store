import type { Core } from '@strapi/strapi';
import { setPublicPermissions } from './utils/set-public-permissions';

export default {
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi);
  },
};
