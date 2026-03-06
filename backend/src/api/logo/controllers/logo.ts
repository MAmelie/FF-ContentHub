/**
 * logo controller
 *
 * Override find to use a safe populate for the logo media field.
 * Strapi 5 can reject client populate=logo with "Invalid key related at logo.related";
 * we force a simple populate so the media is returned without triggering that validation.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::logo.logo', ({ strapi }) => ({
  async find(ctx) {
    // Force a safe populate: only the "logo" media field, no nested keys (e.g. "related")
    ctx.query = {
      ...ctx.query,
      populate: { logo: true },
    };
    return super.find(ctx);
  },
}));
