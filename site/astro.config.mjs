import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// GitHub Pages deployment config
export default defineConfig({
  site: 'https://wahidsuman.github.io',
  base: '/ai-content-hub',
  integrations: [
    tailwind(),
    sitemap()
  ],
  output: 'static', // Changed to static for GitHub Pages
  build: {
    assets: 'astro'
  }
});