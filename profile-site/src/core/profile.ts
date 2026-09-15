import { bioSchema, type Bio } from './schemas';

/** The Sections the Profile is made of. Fixed by the project, not by content. */
export type SectionName = 'bio';

/** One thing wrong with the content, said so the Owner can fix it without reading a schema. */
export type ContentError = {
  section: SectionName;
  /** The id or index of the item at fault; nothing for a single-file Section like the Bio. */
  item: string | number | undefined;
  field: string;
  /** A sentence naming what is wrong. */
  message: string;
};

/** The Bio as its file gives it: frontmatter not yet validated, and the prose below it. */
export type BioInput = { data: unknown; body: string };

/** Every Section, as parsed by Astro's collections or built by a test. */
export type Sections = {
  bio: BioInput | undefined;
};

/** The Profile, ready to render. The page reads this and decides nothing. */
export type Profile = {
  /** First name plus Handle, never the full legal name. */
  displayName: string;
  bio: {
    firstName: string;
    handle: string;
    tagline: string;
    /** The Bio's body, as Markdown. */
    prose: string;
  };
};

export type LoadResult = { ok: true; profile: Profile } | { ok: false; errors: ContentError[] };

/** What the Owner calls each Bio field, for the error sentences. */
const bioFieldLabels = {
  firstName: 'first name',
  handle: 'Handle',
  tagline: 'Tagline',
} satisfies Record<keyof Bio, string>;

const bioFieldLabel = (field: string): string =>
  field in bioFieldLabels ? bioFieldLabels[field as keyof Bio] : field;

const bioError = (field: string, message: string): ContentError => ({
  section: 'bio',
  item: undefined,
  field,
  message,
});

/**
 * The single seam for every content rule. Validates each Section's fields with
 * the shared schemas, applies the rules that span fields, and either returns
 * the Profile or every error found, so the Owner fixes everything in one pass.
 */
export function loadProfile(sections: Sections): LoadResult {
  const errors: ContentError[] = [];

  const { bio } = sections;
  if (bio === undefined) {
    errors.push(bioError('file', 'The Bio is missing. Write it as bio.md in the content folder.'));
    return { ok: false, errors };
  }

  const frontmatter = bioSchema.safeParse(bio.data);
  if (!frontmatter.success) {
    for (const issue of frontmatter.error.issues) {
      const field = issue.path.map(String).join('.');
      errors.push(bioError(field, `The Bio's ${bioFieldLabel(field)} ${issue.message}.`));
    }
  }

  const prose = bio.body.trim();
  if (prose === '') {
    errors.push(bioError('body', 'The Bio has no prose. Write who you are below the frontmatter.'));
  }

  if (!frontmatter.success || errors.length > 0) {
    return { ok: false, errors };
  }

  const { firstName, handle, tagline } = frontmatter.data;
  return {
    ok: true,
    profile: {
      displayName: `${firstName} (${handle})`,
      bio: { firstName, handle, tagline, prose },
    },
  };
}
