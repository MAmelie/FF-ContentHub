// import type { Core } from '@strapi/strapi';
import fs from 'node:fs';
import path from 'node:path';

const EXPERT_NET_UID = 'api::expert-net.expert-net';

type ExpertNetFaqSeed = {
  faq_heading?: string;
  faq_always_visible_category?: string;
  faq_items: Array<{
    category: string;
    question: string;
    answer: string;
    sort_order?: number;
  }>;
};

async function seedExpertNetFaqIfEmpty(strapi: {
  dirs: { app: { root: string } };
  log: { info: (msg: string) => void; warn: (msg: string) => void };
  documents: (uid: string) => {
    findFirst: (params?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    update: (params: Record<string, unknown>) => Promise<unknown>;
  };
}) {
  const seedPath = path.join(strapi.dirs.app.root, 'data', 'expert-net-faq-seed.json');
  if (!fs.existsSync(seedPath)) {
    strapi.log.warn(`Expert-Net FAQ seed file missing: ${seedPath}`);
    return;
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as ExpertNetFaqSeed;
  if (!Array.isArray(seed.faq_items) || seed.faq_items.length === 0) return;

  const force = process.env.SEED_EXPERT_NET_FAQ === 'force';

  const published = await strapi.documents(EXPERT_NET_UID).findFirst({
    status: 'published',
    populate: { faq_items: true },
  });
  const draft = await strapi.documents(EXPERT_NET_UID).findFirst({
    status: 'draft',
    populate: { faq_items: true },
  });
  const doc = published ?? draft;
  if (!doc?.documentId) {
    strapi.log.warn('Expert-Net entry not found; skip FAQ seed.');
    return;
  }

  const existingItems = doc.faq_items;
  const hasItems = Array.isArray(existingItems) && existingItems.length > 0;
  if (hasItems && !force) {
    strapi.log.info('Expert-Net FAQ already populated; skip seed (set SEED_EXPERT_NET_FAQ=force to overwrite).');
    return;
  }

  await strapi.documents(EXPERT_NET_UID).update({
    documentId: doc.documentId,
    data: {
      faq_heading: seed.faq_heading ?? 'Frequently asked questions',
      faq_always_visible_category: seed.faq_always_visible_category ?? 'Overview',
      faq_items: seed.faq_items,
    },
    status: 'published',
  });

  strapi.log.info(
    `Expert-Net FAQ seeded: ${seed.faq_items.length} items (${force ? 'forced overwrite' : 'was empty'}).`
  );
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Override Discord provider: add guilds scope and require Feedforward server membership
    const registry = strapi.plugin('users-permissions').service('providers-registry');
    const discord = registry.get('discord');
    if (discord) {
      const originalAuthCallback = discord.authCallback.bind(discord);
      const baseScope = Array.isArray(discord.grantConfig?.scope)
        ? discord.grantConfig.scope
        : ['identify', 'email'];
      const scopeWithGuilds = baseScope.includes('guilds') ? baseScope : [...baseScope, 'guilds'];

      registry.add('discord', {
        ...discord,
        grantConfig: {
          ...discord.grantConfig,
          scope: scopeWithGuilds,
        },
        async authCallback(args: { accessToken: string; query: unknown; providers: unknown; purest: unknown }) {
          const profile = await originalAuthCallback(args);
          const allowedGuildId = process.env.DISCORD_ALLOWED_GUILD_ID?.trim();
          if (!allowedGuildId) {
            strapi.log.warn('DISCORD_ALLOWED_GUILD_ID is not set; skipping Discord guild check.');
            return profile;
          }
          try {
            const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
              headers: {
                Authorization: `Bearer ${args.accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (!res.ok) {
              const text = await res.text();
              strapi.log.error('Discord guilds API error:', res.status, text);
              throw new Error('Failed to fetch Discord guilds');
            }
            const guilds = (await res.json()) as { id: string }[];
            const isMember = Array.isArray(guilds) && guilds.some((g) => g.id === allowedGuildId);
            if (!isMember) {
              throw new Error('You must be a member of the Feedforward Discord server to sign in.');
            }
          } catch (err) {
            strapi.log.error('Discord guild check failed:', err);
            throw err;
          }
          return profile;
        },
      });
    }

    // Ensure stored grant config includes guilds scope for Discord (used by Grant middleware)
    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const grantConfig = (await pluginStore.get({ key: 'grant' })) as Record<string, { scope?: string | string[] }> | null;
    if (grantConfig?.discord) {
      const current = grantConfig.discord.scope;
      const scopes = Array.isArray(current) ? current : typeof current === 'string' ? current.split(' ') : [];
      if (!scopes.includes('guilds')) {
        grantConfig.discord.scope = [...scopes, 'guilds'];
        await pluginStore.set({ key: 'grant', value: grantConfig });
      }
    }

    try {
      await seedExpertNetFaqIfEmpty(strapi);
    } catch (err) {
      strapi.log.warn(`Expert-Net FAQ seed failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};
