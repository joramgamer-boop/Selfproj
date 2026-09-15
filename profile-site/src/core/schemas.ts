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

/**
 * One Link: somewhere the Owner exists elsewhere on the web. The URL must be
 * absolute, with a scheme and a host, so a Visitor never follows a relative
 * or dead one.
 */
export const linkSchema = z.object({
  label: requiredText(),
  url: z
    .url({
      protocol: /^https?$/,
      hostname: /.+/,
      error: (issue) =>
        issue.input === undefined
          ? 'is missing'
          : typeof issue.input !== 'string'
            ? 'must be text'
            : 'must be an absolute URL with a scheme and a host, like https://example.com/you',
    })
    .trim(),
  isContactChannel: z.boolean({
    error: (issue) => (issue.input === undefined ? 'is missing' : 'must be true or false'),
  }),
});

export type Link = z.infer<typeof linkSchema>;

/** The Links Section as its file gives it: a list of Links, in the order written. */
export const linksSchema = z.array(linkSchema, { error: 'must be a list of Links' });
