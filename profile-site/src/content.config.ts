import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { bioSchema, linksSchema, nowSchema, skillsSchema } from './core/schemas';

// One collection per Section. Each uses the shared schema from src/core, so the
// build validates content with the very definitions the loader tests use.
const bio = defineCollection({
  loader: glob({ pattern: 'bio.md', base: './src/content' }),
  schema: bioSchema,
});

// now.json is one object: the Updated date and the Items. The file loader wants
// a list of entries with ids, so the parser wraps the object as the one entry `now`.
const now = defineCollection({
  loader: file('./src/content/now.json', {
    parser: (text) => [{ id: 'now', ...JSON.parse(text) }],
  }),
  schema: nowSchema,
});

// skills.json is a bare list, as the Owner writes it. Wrapped as the one entry
// `skills` for the same reason as links below.
const skills = defineCollection({
  loader: file('./src/content/skills.json', {
    parser: (text) => [{ id: 'skills', skills: JSON.parse(text) }],
  }),
  schema: z.object({ skills: skillsSchema }),
});

// links.json is a bare list, as the Owner writes it. Astro's file loader wants
// entries with ids, so the parser wraps the whole list as the one entry `links`.
const links = defineCollection({
  loader: file('./src/content/links.json', {
    parser: (text) => [{ id: 'links', links: JSON.parse(text) }],
  }),
  schema: z.object({ links: linksSchema }),
});

export const collections = { bio, now, skills, links };
