import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkLocalizedLinks, { migrationRoutes } from './src/lib/legacy-links.mjs';

const { en, zh } = migrationRoutes();
const contentPaths = new Set([...en, ...zh]);

export default defineConfig({
  site: 'https://www.mteng.ltd',
  trailingSlash: 'always',
  markdown: { processor: unified({ remarkPlugins: [remarkLocalizedLinks] }) },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap({ filter: (url) => contentPaths.has(decodeURIComponent(new URL(url).pathname)) })],
});
