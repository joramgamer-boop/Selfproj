import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { bioSchema } from './core/schemas';

// One collection per Section. Each uses the shared schema from src/core, so the
// build validates frontmatter with the very definitions the loader tests use.
const bio = defineCollection({
  loader: glob({ pattern: 'bio.md', base: './src/content' }),
  schema: bioSchema,
});

export const collections = { bio };
