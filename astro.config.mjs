import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.mteng.ltd',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap({ filter: (url) => !/\/(admin|404)(\/|\.)/.test(url) && !url.includes("今日份日记") && !url.includes("%E4%BB%8A%E6%97%A5") })],
});
