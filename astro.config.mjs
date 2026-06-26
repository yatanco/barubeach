import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://casagaviota.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [react(), tailwind()],
});
