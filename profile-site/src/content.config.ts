import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { bioSchema, linksSchema, nowSchema, projectsSchema, skillsSchema } from './core/schemas';

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

/**
 * A Section whose file is a bare list, as the Owner writes it. Astro's file
 * loader wants entries with ids, so the parser wraps the whole list as one
 * entry named after the Section, under a key of the same name.
 */
const listCollection = <Schema extends z.ZodTypeAny>(name: string, schema: Schema) =>
  defineCollection({
    loader: file(`./src/content/${name}.json`, {
      parser: (text) => [{ id: name, [name]: JSON.parse(text) }],
    }),
    schema: z.object({ [name]: schema }),
  });

const projects = listCollection('projects', projectsSchema);
const skills = listCollection('skills', skillsSchema);
const links = listCollection('links', linksSchema);

export const collections = { bio, now, projects, skills, links };
