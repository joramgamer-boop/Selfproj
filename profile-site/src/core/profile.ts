import {
  bioSchema,
  linksSchema,
  nowSchema,
  SKILL_CATEGORIES,
  skillsSchema,
  type Bio,
  type Link,
  type Now,
  type NowItem,
  type Skill,
  type SkillCategory,
} from './schemas';

/** The Sections the Profile is made of. Fixed by the project, not by content. */
export type SectionName = 'bio' | 'now' | 'skills' | 'links';

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

/** The Now Section as its file gives it: the raw object, not yet validated. */
export type NowInput = { data: unknown };

/** The Skills Section as its file gives it: the raw list, not yet validated. */
export type SkillsInput = { data: unknown };

/** The Links Section as its file gives it: the raw list, not yet validated. */
export type LinksInput = { data: unknown };

/** Every Section, as parsed by Astro's collections or built by a test. `undefined` is a missing file. */
export type Sections = {
  bio: BioInput | undefined;
  now: NowInput | undefined;
  skills: SkillsInput | undefined;
  links: LinksInput | undefined;
};

/** The Skills of one Category, in the order the Owner wrote them. Only Categories with a Skill appear. */
export type SkillGroup = {
  category: SkillCategory;
  /** The Category's name as the page shows it: Language, Framework, Tool or Practice. */
  label: string;
  skills: Skill[];
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
  now: {
    /** Whether the page shows the Now Section at all: false when there are no Items. */
    renders: boolean;
    /** The date the Owner last changed Now, as written: `YYYY-MM-DD`. */
    updated: string;
    /** Every Now Item, in the order the Owner wrote them. */
    items: NowItem[];
  };
  skills: {
    /** Whether the page shows the Skills Section at all: false when there are no Skills. */
    renders: boolean;
    /** The Skills grouped by Category, in the fixed order language, framework, tool, practice; empty groups omitted. */
    groups: SkillGroup[];
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
  const now = loadNow(sections.now);
  const skills = loadSkills(sections.skills);
  const links = loadLinks(sections.links);

  const errors = [...bio.errors, ...now.errors, ...skills.errors, ...links.errors];
  if (
    bio.value === undefined ||
    now.value === undefined ||
    skills.value === undefined ||
    links.value === undefined ||
    errors.length > 0
  ) {
    return { ok: false, errors };
  }

  const { firstName, handle } = bio.value;
  return {
    ok: true,
    profile: {
      displayName: `${firstName} (${handle})`,
      bio: bio.value,
      now: now.value,
      skills: skills.value,
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

const nowError = errorsIn('now');

const nowFieldLabel = fieldLabel({
  updated: 'Updated date',
  items: 'list of Items',
} satisfies Record<keyof Now, string>);

const nowItemFieldLabel = fieldLabel({
  kind: 'Kind',
  text: 'text',
} satisfies Record<keyof NowItem, string>);

function loadNow(input: NowInput | undefined): SectionResult<Profile['now']> {
  const errors: ContentError[] = [];
  if (input === undefined) {
    errors.push(nowError(undefined, 'file', 'The Now Section is missing. Write it as now.json in the content folder.'));
    return { value: undefined, errors };
  }

  const parsed = nowSchema.safeParse(input.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [top, index, ...rest] = issue.path;
      if (top === 'items' && typeof index === 'number') {
        // A fault inside one Item: named by its index, since Items have no id.
        const field = rest.map(String).join('.');
        const sentence = `${indexPhrase('Now Item', index)}'s ${nowItemFieldLabel(field)} ${issue.message}.`;
        errors.push(nowError(index, field, capitalised(sentence)));
      } else if (top === undefined) {
        // The file as a whole is not the object the schema expects.
        errors.push(nowError(undefined, 'file', `The Now file ${issue.message}.`));
      } else {
        const field = issue.path.map(String).join('.');
        errors.push(nowError(undefined, field, `The Now Section's ${nowFieldLabel(field)} ${issue.message}.`));
      }
    }
    return { value: undefined, errors };
  }

  const { updated, items } = parsed.data;
  return { value: { renders: items.length > 0, updated, items }, errors };
}

const skillsError = errorsIn('skills');

const skillFieldLabel = fieldLabel({
  id: 'id',
  name: 'name',
  category: 'Category',
} satisfies Record<keyof Skill, string>);

/** How an error names a Skill: by its id when it has a usable one, else by its index in the list. */
const skillItem = itemNamedBy('id');

/** How a sentence names a Skill: "the python Skill", or by its place in the file when it has no usable id. */
const skillPhrase = itemPhrase('Skill');

/** What the page calls each Category. */
const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'Language',
  framework: 'Framework',
  tool: 'Tool',
  practice: 'Practice',
};

function loadSkills(input: SkillsInput | undefined): SectionResult<Profile['skills']> {
  const errors: ContentError[] = [];
  if (input === undefined) {
    errors.push(skillsError(undefined, 'file', 'The Skills Section is missing. Write it as skills.json in the content folder.'));
    return { value: undefined, errors };
  }

  const parsed = skillsSchema.safeParse(input.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [index, ...rest] = issue.path;
      if (typeof index !== 'number') {
        errors.push(skillsError(undefined, 'file', `The Skills file ${issue.message}.`));
        continue;
      }
      const item = skillItem(input.data, index);
      const field = rest.map(String).join('.');
      const sentence = `${skillPhrase(item)}'s ${skillFieldLabel(field)} ${issue.message}.`;
      errors.push(skillsError(item, field, capitalised(sentence)));
    }
    return { value: undefined, errors };
  }

  const skills = parsed.data;
  for (const [id, positions] of positionsById(skills)) {
    if (positions.length < 2) continue;
    const where = positions.map((index) => `index ${index}`).join(' and ');
    errors.push(skillsError(id, 'id', `The id ${id} is used by more than one Skill: at ${where}. Give each Skill its own id.`));
  }
  if (errors.length > 0) return { value: undefined, errors };

  const groups = SKILL_CATEGORIES.map((category) => ({
    category,
    label: SKILL_CATEGORY_LABELS[category],
    skills: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);
  return { value: { renders: skills.length > 0, groups }, errors };
}

/** Every id in the list and the indexes it appears at, in first-seen order. */
const positionsById = (items: { id: string }[]): Map<string, number[]> => {
  const positions = new Map<string, number[]>();
  items.forEach((item, index) => positions.set(item.id, [...(positions.get(item.id) ?? []), index]));
  return positions;
};

const linksError = errorsIn('links');

const linkFieldLabel = fieldLabel({
  label: 'label',
  url: 'URL',
  isContactChannel: 'Contact Channel mark',
} satisfies Record<keyof Link, string>);

/** How an error names a Link: by its label when it has a usable one, else by its index in the list. */
const linkItem = itemNamedBy('label');

/** How a sentence names a Link: "the GitHub Link", or by its place in the file when it has no usable label. */
const linkPhrase = itemPhrase('Link');

/**
 * How an error names an item of a list Section: by the given field of the raw
 * item when that is usable text, else by the item's index in the list.
 */
function itemNamedBy(key: string) {
  return (data: unknown, index: number): string | number => {
    const raw: unknown = Array.isArray(data) ? data[index] : undefined;
    const name = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)[key] : undefined;
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : index;
  };
}

/** How a sentence names an item: "the GitHub Link", or by its place in the file when it has no usable name. */
function itemPhrase(noun: string) {
  return (item: string | number): string => (typeof item === 'string' ? `the ${item} ${noun}` : indexPhrase(noun, item));
}

/** How a sentence names an item that has only its place in the file: "the Link at index 1 (the 2nd in the file)". */
const indexPhrase = (noun: string, index: number): string => `the ${noun} at index ${index} (the ${ordinal(index + 1)} in the file)`;

const ordinal = (n: number): string => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

const capitalised = (sentence: string): string => sentence.charAt(0).toUpperCase() + sentence.slice(1);

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
      errors.push(linksError(item, field, capitalised(sentence)));
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
