import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://casagaviota.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  // Not used by this project. Setting a driver here (instead of leaving
  // session.driver unset) stops the Cloudflare adapter from auto-enabling
  // its Cloudflare KV session driver, which requires a SESSION KV binding.
  session: {
    driver: 'memory',
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
