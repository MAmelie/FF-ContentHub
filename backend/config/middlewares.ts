export default ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: (() => {
        const origins = ['http://localhost:3000'];
        const frontendUrl = env('FRONTEND_URL', '');
        if (frontendUrl) {
          const seen = new Set<string>();
          frontendUrl.split(',').forEach((u) => {
            const trimmed = u.trim().replace(/\/+$/, '');
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              origins.push(trimmed);
            }
          });
        }
        return origins;
      })(),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb',
      jsonLimit: '256mb',
      textLimit: '256mb',
      formidable: {
        maxFileSize: 250 * 1024 * 1024, // 250 MB – allows larger MP3s
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
