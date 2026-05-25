// import type { Core } from '@strapi/strapi';
import fs from 'node:fs';
import path from 'node:path';

const EXPERT_NET_UID = 'api::expert-net.expert-net';
const EXPERT_NET_AI_GUIDE_OPENING_DEFAULT =
  "Hi! I'm here to help match you with the right expert. What challenges are you facing or what would you like to accomplish with an expert advisory session?";
const HOMEPAGE_HERO_UID = 'api::homepage-hero.homepage-hero';
const HOMEPAGE_HERO_TITLE = 'Member Portal Home';
const LOGO_UID = 'api::logo.logo';
const LOGO_TITLE = 'Logo';
const PODCASTS_PAGE_UID = 'api::podcasts-page.podcasts-page';
const ADDITIONAL_CONTENT_PAGE_UID = 'api::additional-content-page.additional-content-page';
const WRONG_CM_CONFIG_KEY = `plugin_content-manager_configuration_content_types::${HOMEPAGE_HERO_UID}`;

const PODCASTS_PAGE_DEFAULTS = {
  title: 'Podcasts',
  intro:
    'Dive into Feedforward conversations, interviews and explainers. Expand an episode for show notes.',
};

const ADDITIONAL_CONTENT_PAGE_DEFAULTS = {
  title: 'Additional content',
  intro: 'Browse supplementary resources, guides, and downloads from Feedforward.',
};

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

async function ensureExpertNetAiGuideOpening(strapi: {
  log: { info: (msg: string) => void; warn: (msg: string) => void };
  documents: (uid: string) => {
    findFirst: (params?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    update: (params: Record<string, unknown>) => Promise<unknown>;
  };
}) {
  const published = await strapi.documents(EXPERT_NET_UID).findFirst({ status: 'published' });
  const draft = await strapi.documents(EXPERT_NET_UID).findFirst({ status: 'draft' });
  const doc = published ?? draft;
  if (!doc?.documentId) {
    strapi.log.warn('Expert-Net entry not found; skip AI guide opening message seed.');
    return;
  }

  const existing =
    typeof doc.ai_guide_opening_message === 'string' ? doc.ai_guide_opening_message.trim() : '';
  if (existing) return;

  await strapi.documents(EXPERT_NET_UID).update({
    documentId: doc.documentId,
    data: { ai_guide_opening_message: EXPERT_NET_AI_GUIDE_OPENING_DEFAULT },
    status: published ? 'published' : 'draft',
  });
  strapi.log.info('Expert-Net: set default AI guide opening message.');
}

type CmConfig = {
  uid?: string;
  settings?: { mainField?: string; defaultSortBy?: string; [key: string]: unknown };
  metadatas?: Record<string, unknown>;
  layouts?: Record<string, unknown>;
};

async function fixContentManagerEntryTitle(
  strapi: {
    db: {
      connection: (table: string) => {
        where: (q: Record<string, string>) => {
          first: () => Promise<{ value: unknown } | undefined>;
          update: (data: Record<string, unknown>) => Promise<unknown>;
          del: () => Promise<unknown>;
        };
      };
    };
    log: { info: (msg: string) => void };
  },
  uid: string,
  mainField: string
) {
  const key = `plugin_content_manager_configuration_content_types::${uid}`;
  const row = await strapi.db.connection('strapi_core_store_settings').where({ key }).first();
  if (!row?.value) return;

  const value = (
    typeof row.value === 'string' ? JSON.parse(row.value) : row.value
  ) as CmConfig;
  if (value.settings?.mainField === mainField) return;

  value.settings = {
    ...value.settings,
    mainField,
    defaultSortBy: mainField,
  };

  await strapi.db
    .connection('strapi_core_store_settings')
    .where({ key })
    .update({ value: JSON.stringify(value) });

  strapi.log.info(`${uid}: admin entry title set to "${mainField}".`);
}

const PUBLIC_CMS_FIND_ACTIONS = [
  'api::podcasts-page.podcasts-page.find',
  'api::additional-content-page.additional-content-page.find',
  'api::homepage-hero.homepage-hero.find',
  'api::expert-net.expert-net.find',
];

async function ensureRoleHasFindPermission(
  strapi: {
    db: {
      connection: (table: string) => {
        where: (q: Record<string, unknown>) => {
          first: () => Promise<{ id: number } | undefined>;
        };
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      };
      query: (uid: string) => {
        findOne: (params: { where: Record<string, unknown> }) => Promise<{ id: number } | null>;
      };
    };
    log: { info: (msg: string) => void };
  },
  roleType: 'public' | 'authenticated',
  action: string
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role?.id) return;

  const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: { action },
  });
  if (!permission?.id) return;

  const linked = await strapi.db
    .connection('up_permissions_role_lnk')
    .where({ permission_id: permission.id, role_id: role.id })
    .first();
  if (linked) return;

  await strapi.db.connection('up_permissions_role_lnk').insert({
    permission_id: permission.id,
    role_id: role.id,
  });
  strapi.log.info(`${roleType} role: enabled ${action}`);
}

async function ensurePublicCmsFindPermissions(strapi: Parameters<typeof ensureRoleHasFindPermission>[0]) {
  for (const action of PUBLIC_CMS_FIND_ACTIONS) {
    await ensureRoleHasFindPermission(strapi, 'public', action);
    await ensureRoleHasFindPermission(strapi, 'authenticated', action);
  }
}

async function removeWrongContentManagerConfig(strapi: {
  db: {
    connection: (table: string) => {
      where: (q: Record<string, string>) => { del: () => Promise<unknown> };
    };
  };
}) {
  await strapi.db.connection('strapi_core_store_settings').where({ key: WRONG_CM_CONFIG_KEY }).del();
}

async function ensureSingleTypeTitle(
  strapi: {
    log: { info: (msg: string) => void; warn: (msg: string) => void };
    documents: (uid: string) => {
      findFirst: (params?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      update: (params: Record<string, unknown>) => Promise<unknown>;
    };
  },
  uid: string,
  title: string,
  label: string
) {
  const published = await strapi.documents(uid).findFirst({ status: 'published' });
  const draft = await strapi.documents(uid).findFirst({ status: 'draft' });
  const doc = published ?? draft;
  if (!doc?.documentId) {
    strapi.log.warn(`${label} entry not found; skip title seed.`);
    return;
  }

  const existingTitle = typeof doc.title === 'string' ? doc.title.trim() : '';
  if (existingTitle) return;

  await strapi.documents(uid).update({
    documentId: doc.documentId,
    data: { title },
    status: published ? 'published' : 'draft',
  });
  strapi.log.info(`${label}: set title to "${title}".`);
}

async function ensureSingleTypePageCopy(
  strapi: {
    log: { info: (msg: string) => void; warn: (msg: string) => void };
    documents: (uid: string) => {
      findFirst: (params?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      create: (params: Record<string, unknown>) => Promise<unknown>;
      update: (params: Record<string, unknown>) => Promise<unknown>;
    };
  },
  uid: string,
  defaults: { title: string; intro: string },
  label: string
) {
  const published = await strapi.documents(uid).findFirst({ status: 'published' });
  const draft = await strapi.documents(uid).findFirst({ status: 'draft' });
  let doc = published ?? draft;

  if (!doc?.documentId) {
    await strapi.documents(uid).create({
      data: { title: defaults.title, intro: defaults.intro },
      status: 'published',
    });
    strapi.log.info(`${label}: created with default title and intro.`);
    return;
  }

  const existingTitle = typeof doc.title === 'string' ? doc.title.trim() : '';
  const existingIntro = typeof doc.intro === 'string' ? doc.intro.trim() : '';
  if (existingTitle && existingIntro) return;

  await strapi.documents(uid).update({
    documentId: doc.documentId,
    data: {
      title: existingTitle || defaults.title,
      intro: existingIntro || defaults.intro,
    },
    status: published ? 'published' : 'draft',
  });
  strapi.log.info(`${label}: filled missing title/intro from defaults.`);
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
      await ensureExpertNetAiGuideOpening(strapi);
    } catch (err) {
      strapi.log.warn(`Expert-Net FAQ seed failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await ensurePublicCmsFindPermissions(strapi);
      await removeWrongContentManagerConfig(strapi);
      await fixContentManagerEntryTitle(strapi, HOMEPAGE_HERO_UID, 'title');
      await fixContentManagerEntryTitle(strapi, LOGO_UID, 'title');
      await ensureSingleTypeTitle(strapi, HOMEPAGE_HERO_UID, HOMEPAGE_HERO_TITLE, 'Member Portal Home');
      await ensureSingleTypeTitle(strapi, LOGO_UID, LOGO_TITLE, 'Logo');
      await fixContentManagerEntryTitle(strapi, PODCASTS_PAGE_UID, 'title');
      await fixContentManagerEntryTitle(strapi, ADDITIONAL_CONTENT_PAGE_UID, 'title');
      await ensureSingleTypePageCopy(strapi, PODCASTS_PAGE_UID, PODCASTS_PAGE_DEFAULTS, 'Podcasts Page');
      await ensureSingleTypePageCopy(
        strapi,
        ADDITIONAL_CONTENT_PAGE_UID,
        ADDITIONAL_CONTENT_PAGE_DEFAULTS,
        'Additional Content Page'
      );
    } catch (err) {
      strapi.log.warn(
        `Single-type admin title setup failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
};
