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

/** The Kinds a Now Item can have. */
export const NOW_ITEM_KINDS = ['learning', 'building', 'reading', 'other'] as const;

/** One Now Item: one line of what the Owner is doing, with its Kind. */
export const nowItemSchema = z.object({
  kind: z.enum(NOW_ITEM_KINDS, {
    error: (issue) => (issue.input === undefined ? 'is missing' : `must be one of ${NOW_ITEM_KINDS.join(', ')}`),
  }),
  text: requiredText(),
});

export type NowItem = z.infer<typeof nowItemSchema>;

/**
 * The Now Section as its file gives it: the Updated date the Owner set by
 * hand, and the Now Items in the order written. An empty list is valid; the
 * date is required either way.
 */
export const nowSchema = z.object({
  updated: z.iso.date({
    error: (issue) => (issue.input === undefined ? 'is missing' : 'must be a date in YYYY-MM-DD form, like 2026-09-15'),
  }),
  items: z.array(nowItemSchema, {
    error: (issue) => (issue.input === undefined ? 'is missing' : 'must be a list of Now Items'),
  }),
});

export type Now = z.infer<typeof nowSchema>;

/** An absolute URL on the web, with a scheme and a host, so a Visitor never follows a relative or dead one. */
const webUrl = () =>
  z
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
    .trim();

/** One Link: somewhere the Owner exists elsewhere on the web, at a web URL. */
export const linkSchema = z.object({
  label: requiredText(),
  url: webUrl(),
  isContactChannel: z.boolean({
    error: (issue) => (issue.input === undefined ? 'is missing' : 'must be true or false'),
  }),
});

export type Link = z.infer<typeof linkSchema>;

/** The Links Section as its file gives it: a list of Links, in the order written. */
export const linksSchema = z.array(linkSchema, { error: 'must be a list of Links' });

/** The Categories a Skill can have, in the order the page shows them. */
export const SKILL_CATEGORIES = ['language', 'framework', 'tool', 'practice'] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** A stable id the Owner references from elsewhere: lowercase words and digits joined by single hyphens. */
const slug = () =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? 'is missing' : 'must be text'),
    })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: 'must be a slug: lowercase letters and digits joined by single hyphens, like test-driven-development',
    });

/**
 * One Skill: something the Owner claims to be able to use or do, with its
 * Category. No level, rating or years field exists: a Project that lists the
 * Skill is its evidence.
 */
export const skillSchema = z.object({
  id: slug(),
  name: requiredText(),
  category: z.enum(SKILL_CATEGORIES, {
    error: (issue) => (issue.input === undefined ? 'is missing' : `must be one of ${SKILL_CATEGORIES.join(', ')}`),
  }),
});

export type Skill = z.infer<typeof skillSchema>;

/** The Skills Section as its file gives it: a list of Skills, in the order written. */
export const skillsSchema = z.array(skillSchema, { error: 'must be a list of Skills' });

/** The Statuses a Project can have. Active Projects are shown first; the rest follow by most recent Started. */
export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** A month written as `YYYY-MM`, so the Owner never has to invent a day. */
const month = () =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? 'is missing' : 'must be text'),
    })
    .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, { error: 'must be a month in YYYY-MM form, like 2026-08' });

/**
 * One Project: something the Owner has made or is making. A claim the Owner
 * chooses to make, never derived from a folder. Whether its Status, Started
 * and Ended agree, and whether its Skills are declared in the Skills Section,
 * are rules that span fields and Sections, and live in the loader.
 */
export const projectSchema = z.object({
  id: slug(),
  name: requiredText(),
  summary: requiredText(),
  description: requiredText().optional(),
  repoUrl: webUrl().optional(),
  liveUrl: webUrl().optional(),
  status: z.enum(PROJECT_STATUSES, {
    error: (issue) => (issue.input === undefined ? 'is missing' : `must be one of ${PROJECT_STATUSES.join(', ')}`),
  }),
  started: month(),
  ended: month().optional(),
  skills: z.array(slug(), {
    error: (issue) => (issue.input === undefined ? 'is missing' : 'must be a list of Skill ids'),
  }),
});

export type Project = z.infer<typeof projectSchema>;

/** The Projects Section as its file gives it: a list of Projects, in the order written. */
export const projectsSchema = z.array(projectSchema, { error: 'must be a list of Projects' });
