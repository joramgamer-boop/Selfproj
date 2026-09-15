import { getEntry, render } from 'astro:content';
import { loadProfile, type ContentError } from './core/profile';

/**
 * The one place the build meets the content. Reads each Section from Astro's
 * collections, runs the Profile loader once, and throws with every error if
 * anything is wrong, so nothing invalid ever reaches the live site.
 */
export async function getProfile() {
  const bioEntry = await getEntry('bio', 'bio');

  const result = loadProfile({
    bio: bioEntry ? { data: bioEntry.data, body: bioEntry.body ?? '' } : undefined,
  });
  if (!result.ok) throw new Error(formatContentErrors(result.errors));
  // The loader only returns a Profile when the Bio file exists.
  if (!bioEntry) throw new Error('The Bio passed validation without a file, which cannot happen.');

  // The prose is rendered by Astro's Markdown pipeline, so the page gets a
  // component for it beside the view model instead of the raw Markdown.
  const { Content: BioProse } = await render(bioEntry);
  return { profile: result.profile, BioProse };
}

const formatContentErrors = (errors: ContentError[]): string => {
  const count = errors.length === 1 ? 'a problem' : `${errors.length} problems`;
  const lines = errors.map(({ section, item, field, message }) => {
    const where = item === undefined ? section : `${section} ${item}`;
    return `  - ${where}, ${field}: ${message}`;
  });
  return [`The Profile content has ${count}:`, ...lines].join('\n');
};
