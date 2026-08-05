import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default defineConfig({
  site: 'https://casagaviota.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  image: {
    // Default layout for <Image>/<Picture> (sets fit/position defaults);
    // can still be overridden per-image. The actual image service stays
    // whatever the adapter's `imageService: 'compile'` above wires up —
    // 'astro/assets/services/compile' isn't a real module in this Astro
    // version, only .../sharp and .../noop exist.
    layout: 'constrained',
  },
  redirects: {
    '/gallery': '/photos',
    '/es/gallery': '/photos',
  },
  // Not used by this project. Setting a driver here (instead of leaving
  // session.driver unset) stops the Cloudflare adapter from auto-enabling
  // its Cloudflare KV session driver, which requires a SESSION KV binding.
  session: {
    driver: 'memory',
  },
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
  },
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          es: 'es-CO',
        },
      },
    }),
    tailwind(),
  ],
});
