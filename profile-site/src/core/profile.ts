import { bioSchema, linksSchema, type Bio, type Link } from './schemas';

/** The Sections the Profile is made of. Fixed by the project, not by content. */
export type SectionName = 'bio' | 'links';

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

/** The Links Section as its file gives it: the raw list, not yet validated. */
export type LinksInput = { data: unknown };

/** Every Section, as parsed by Astro's collections or built by a test. `undefined` is a missing file. */
export type Sections = {
  bio: BioInput | undefined;
  links: LinksInput | undefined;
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
  /** Every Link, in the order the Owner wrote them. */
  links: Link[];
  /** The one Link a Visitor is invited to use to reach the Owner. */
  contactChannel: Link;
};

export type LoadResult = { ok: true; profile: Profile } | { ok: false; errors: ContentError[] };

/**
 * The single seam for every content rule. Validates each Section's fields with
 * the shared schemas, applies the rules that span fields, and either returns
 * the Profile or every error found, so the Owner fixes everything in one pass.
 */
export function loadProfile(sections: Sections): LoadResult {
  const bio = loadBio(sections.bio);
  const links = loadLinks(sections.links);

  const errors = [...bio.errors, ...links.errors];
  if (bio.value === undefined || links.value === undefined || errors.length > 0) {
    return { ok: false, errors };
  }

  const { firstName, handle } = bio.value;
  return {
    ok: true,
    profile: {
      displayName: `${firstName} (${handle})`,
      bio: bio.value,
      ...links.value,
    },
  };
}

/** What one Section's rules produced: its value when every rule passed, and every error found. */
type SectionResult<T> = { value: T | undefined; errors: ContentError[] };

/** Builds the errors of one Section, so each rule only says the item, the field and the sentence. */
const errorsIn =
  (section: SectionName) =>
  (item: ContentError['item'], field: string, message: string): ContentError => ({ section, item, field, message });

/** What the Owner calls a field, for the error sentences; a field with no name of its own keeps the key. */
const fieldLabel =
  (labels: Record<string, string>) =>
  (field: string): string =>
    labels[field] ?? field;

const bioError = errorsIn('bio');

const bioFieldLabel = fieldLabel({
  firstName: 'first name',
  handle: 'Handle',
  tagline: 'Tagline',
} satisfies Record<keyof Bio, string>);

function loadBio(bio: BioInput | undefined): SectionResult<Profile['bio']> {
  const errors: ContentError[] = [];

  if (bio === undefined) {
    errors.push(bioError(undefined, 'file', 'The Bio is missing. Write it as bio.md in the content folder.'));
    return { value: undefined, errors };
  }

  const frontmatter = bioSchema.safeParse(bio.data);
  if (!frontmatter.success) {
    for (const issue of frontmatter.error.issues) {
      const field = issue.path.map(String).join('.');
      errors.push(bioError(undefined, field, `The Bio's ${bioFieldLabel(field)} ${issue.message}.`));
    }
  }

  const prose = bio.body.trim();
  if (prose === '') {
    errors.push(bioError(undefined, 'body', 'The Bio has no prose. Write who you are below the frontmatter.'));
  }

  if (!frontmatter.success || errors.length > 0) return { value: undefined, errors };

  const { firstName, handle, tagline } = frontmatter.data;
  return { value: { firstName, handle, tagline, prose }, errors };
}

const linksError = errorsIn('links');

const linkFieldLabel = fieldLabel({
  label: 'label',
  url: 'URL',
  isContactChannel: 'Contact Channel mark',
} satisfies Record<keyof Link, string>);

/** How an error names a Link: by its label when it has a usable one, else by its index in the list. */
const linkItem = (data: unknown, index: number): string | number => {
  const raw: unknown = Array.isArray(data) ? data[index] : undefined;
  const label = typeof raw === 'object' && raw !== null && 'label' in raw ? raw.label : undefined;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : index;
};

/** How a sentence names a Link: "the GitHub Link", or by its place in the file when it has no usable label. */
const linkPhrase = (item: string | number): string =>
  typeof item === 'string' ? `the ${item} Link` : `the Link at index ${item} (the ${ordinal(item + 1)} in the file)`;

const ordinal = (n: number): string => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

const CONTACT_CHANNEL_FIX = 'Mark exactly one Link with "isContactChannel": true.';

function loadLinks(input: LinksInput | undefined): SectionResult<Pick<Profile, 'links' | 'contactChannel'>> {
  const errors: ContentError[] = [];
  if (input === undefined) {
    errors.push(linksError(undefined, 'file', 'The Links Section is missing. Write it as links.json in the content folder.'));
    return { value: undefined, errors };
  }

  const parsed = linksSchema.safeParse(input.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [index, ...rest] = issue.path;
      if (typeof index !== 'number') {
        errors.push(linksError(undefined, 'file', `The Links file ${issue.message}.`));
        continue;
      }
      const field = rest.map(String).join('.');
      const item = linkItem(input.data, index);
      const sentence = `${linkPhrase(item)}'s ${linkFieldLabel(field)} ${issue.message}.`;
      errors.push(linksError(item, field, sentence.charAt(0).toUpperCase() + sentence.slice(1)));
    }
    return { value: undefined, errors };
  }

  const links = parsed.data;
  if (links.length === 0) {
    errors.push(linksError(undefined, 'file', 'The Links Section is empty. Write at least one Link in links.json.'));
    return { value: undefined, errors };
  }

  const [contactChannel, ...moreContactChannels] = links.filter((link) => link.isContactChannel);
  if (contactChannel === undefined) {
    errors.push(linksError(undefined, 'isContactChannel', `No Link is the Contact Channel. ${CONTACT_CHANNEL_FIX}`));
    return { value: undefined, errors };
  }
  if (moreContactChannels.length > 0) {
    const labels = [contactChannel, ...moreContactChannels].map((link) => link.label).join(', ');
    errors.push(
      linksError(
        undefined,
        'isContactChannel',
        `More than one Link is the Contact Channel: ${labels}. ${CONTACT_CHANNEL_FIX}`,
      ),
    );
    return { value: undefined, errors };
  }

  return { value: { links, contactChannel }, errors };
}
