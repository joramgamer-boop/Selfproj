// @ts-check
import { defineConfig } from 'astro/config';

// One static page, built from content files in this folder. It is published
// on GitHub Pages under this repository, so every internal URL and asset
// resolves under /Selfproj/profile-site/ (see README.md, "Publishing").
export default defineConfig({
  output: 'static',
  site: 'https://joramgamer-boop.github.io',
  base: '/Selfproj/profile-site',
});
