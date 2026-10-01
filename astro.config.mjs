import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sourcey from 'sourcey/astro';
import { resolve, sep } from 'node:path';
import { specNavigation } from './docs/specification/navigation.ts';
export default defineConfig({
  site: 'https://mailschema.org',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
  vite: {
    plugins: [
      {
        name: 'mailschema-reader-root',
        enforce: 'pre',
        apply: 'serve',
        configureServer(server) {
          // Give the draft a chapter URL so relative reader assets resolve correctly.
          server.middlewares.use((req, res, next) => {
            if (req.url?.split('?')[0] !== '/specification') return next();
            res.writeHead(307, {
              Location: req.url.replace('/specification', '/specification/core'),
            });
            res.end();
          });
        },
      },
    ],
  },
  integrations: [
    sitemap({
      customPages: specNavigation.map(
        (page) => `https://mailschema.org/specification${page.slug ? `/${page.slug}` : ''}`,
      ),
    }),
    {
      name: 'mailschema-registry-watch',
      hooks: {
        'astro:server:setup': ({ server }) => {
          const root = resolve('registry');
          server.watcher.add(root);
          let restart;
          const changed = (path) => {
            if (!resolve(path).startsWith(root + sep) || !path.endsWith('.json')) return;
            clearTimeout(restart);
            restart = setTimeout(() => server.restart(), 150);
          };
          server.watcher.on('add', changed).on('change', changed).on('unlink', changed);
          server.httpServer?.once('close', () => {
            clearTimeout(restart);
            server.watcher.off('add', changed).off('change', changed).off('unlink', changed);
          });
        },
      },
    },
    sourcey({
      config: './docs/specification/sourcey.config.ts',
      routeBase: '/specification',
      prettyUrls: 'strip',
      dev: false,
    }),
    sourcey({
      config: './docs/specification/draft.config.ts',
      routeBase: '/specification',
      prettyUrls: 'strip',
      build: false,
    }),
  ],
});
