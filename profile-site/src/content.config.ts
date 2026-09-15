import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { bioSchema, linksSchema } from './core/schemas';

// One collection per Section. Each uses the shared schema from src/core, so the
// build validates content with the very definitions the loader tests use.
const bio = defineCollection({
  loader: glob({ pattern: 'bio.md', base: './src/content' }),
  schema: bioSchema,
});

// links.json is a bare list, as the Owner writes it. Astro's file loader wants
// entries with ids, so the parser wraps the whole list as the one entry `links`.
const links = defineCollection({
  loader: file('./src/content/links.json', {
    parser: (text) => [{ id: 'links', links: JSON.parse(text) }],
  }),
  schema: z.object({ links: linksSchema }),
});

export const collections = { bio, links };
