import { z } from 'astro/zod';

/**
 * Field-level shape of every Section, shared by Astro's content collections
 * (the build) and the Profile loader (the tests). One set of definitions, so
 * the two can never drift.
 *
 * Messages are sentence fragments: the loader prefixes the Section and the
 * field, so "is missing" reads "The Bio's Tagline is missing."
 */
const requiredText = () =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? 'is missing' : 'must be text'),
    })
    .trim()
    .min(1, { error: 'is empty' });

/** Frontmatter of the Bio file. The prose body is not frontmatter and is not here. */
export const bioSchema = z.object({
  firstName: requiredText(),
  handle: requiredText(),
  tagline: requiredText(),
});

export type Bio = z.infer<typeof bioSchema>;
