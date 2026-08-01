import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://casagaviota.com',
  output: 'static',
  // Astro 7 changed the compressHTML default from `true` to `'jsx'`, which
  // strips whitespace using JSX rules instead of HTML-aware ones — that can
  // silently delete spaces between inline elements. Pin it to restore the
  // pre-v7 behavior everywhere on the site.
  compressHTML: true,
  adapter: cloudflare({
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Default layout for <Image>/<Picture> (sets fit/position defaults);
    // can still be overridden per-image. The actual image service stays
    // whatever the adapter's `imageService: 'compile'` above wires up —
    // 'astro/assets/services/compile' isn't a real module in this Astro
    // version, only .../sharp and .../noop exist.
    layout: 'constrained',
  },
  redirects: {
    '/es/gallery': '/gallery',
  },
  // Not used by this project. Setting a driver here (instead of leaving
  // session.driver unset) stops the Cloudflare adapter from auto-enabling
  // its Cloudflare KV session driver, which requires a SESSION KV binding.
  session: {
    driver: sessionDrivers.memory(),
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
  ],
});
