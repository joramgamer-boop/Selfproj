/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Vitest runs on Astro's own Vite config, so a test resolves modules exactly
// the way the build does. The tests themselves never touch astro:content.
export default getViteConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
