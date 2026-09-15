import type { z } from 'astro/zod';
import {
  bioSchema,
  linksSchema,
  nowSchema,
  projectsSchema,
  SKILL_CATEGORIES,
  skillsSchema,
  type Bio,
  type Link,
  type Now,
  type NowItem,
  type Project,
  type ProjectStatus,
  type Skill,
  type SkillCategory,
} from './schemas';

/** The Sections the Profile is made of. Fixed by the project, not by content. */
export type SectionName = 'bio' | 'now' | 'projects' | 'skills' | 'links';

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

/** The Projects Section as its file gives it: the raw list, not yet validated. */
export type ProjectsInput = { data: unknown };

/** The Skills Section as its file gives it: the raw list, not yet validated. */
export type SkillsInput = { data: unknown };

/** The Links Section as its file gives it: the raw list, not yet validated. */
export type LinksInput = { data: unknown };

/** Every Section, as parsed by Astro's collections or built by a test. `undefined` is a missing file. */
export type Sections = {
  bio: BioInput | undefined;
  now: NowInput | undefined;
  projects: ProjectsInput | undefined;
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

/** One Project as the page shows it: its Skill ids resolved to the Skills themselves, and its Status labelled. */
export type ProjectView = Omit<Project, 'skills'> & {
  /** The Status as the page shows it: Active, Paused, Done or Archived. */
  statusLabel: string;
  /** The Skills the Project used, in the order the Owner listed them. */
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
  projects: {
    /** Whether the page shows the Projects Section at all: false when there are no Projects. */
    renders: boolean;
    /** Every Project, Active first, then by most recent Started, ties broken by name. */
    list: ProjectView[];
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
  const projects = loadProjects(sections.projects, skills.declared);
  const links = loadLinks(sections.links);

  const errors = [...bio.errors, ...now.errors, ...projects.errors, ...skills.errors, ...links.errors];
  if (
    bio.value === undefined ||
    now.value === undefined ||
    projects.value === undefined ||
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
      projects: projects.value,
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

/** How a list Section (Skills, Projects, Links) names itself and its items in error sentences. */
type ListSection = {
  section: SectionName;
  /** The Section's name in a sentence: "Skills". */
  title: string;
  /** The file the Owner writes it in: "skills.json". */
  file: string;
  /** The glossary noun for one item: "Skill". */
  noun: string;
  /** The raw field an error names an item by, when it is usable text: a Skill's id, a Link's label. */
  namedBy: string;
  /** What the Owner calls each field of an item. */
  fieldLabel: (field: string) => string;
};

/** What field validation of a list Section produced: its items when every field passed, else every error found. */
type ListResult<T> = { items: T[]; errors: ContentError[] } | { items: undefined; errors: ContentError[] };

/**
 * Field validation of a list Section with its shared schema. A missing file,
 * or one that is not a list, is an error naming the file; anything else names
 * the item, by its name or its place in the file, and the field.
 */
function parseList<T>(list: ListSection, schema: z.ZodType<T[]>, input: { data: unknown } | undefined): ListResult<T> {
  const error = errorsIn(list.section);
  if (input === undefined) {
    return {
      items: undefined,
      errors: [error(undefined, 'file', `The ${list.title} Section is missing. Write it as ${list.file} in the content folder.`)],
    };
  }

  const parsed = schema.safeParse(input.data);
  if (parsed.success) return { items: parsed.data, errors: [] };

  const itemOf = itemNamedBy(list.namedBy);
  const phraseOf = itemPhrase(list.noun);
  const errors = parsed.error.issues.map((issue) => {
    const [index, ...rest] = issue.path;
    if (typeof index !== 'number') return error(undefined, 'file', `The ${list.title} file ${issue.message}.`);
    const item = itemOf(input.data, index);
    const field = rest.map(String).join('.');
    return error(item, field, capitalised(`${phraseOf(item)}'s ${list.fieldLabel(field)} ${issue.message}.`));
  });
  return { items: undefined, errors };
}

/** The rule that ids in a list Section are unique: a duplicate is an error naming the id and every position it holds. */
function duplicateIdErrors(list: ListSection, items: { id: string }[]): ContentError[] {
  const error = errorsIn(list.section);
  const errors: ContentError[] = [];
  for (const [id, positions] of positionsById(items)) {
    if (positions.length < 2) continue;
    const where = positions.map((index) => `index ${index}`).join(' and ');
    errors.push(error(id, 'id', `The id ${id} is used by more than one ${list.noun}: at ${where}. Give each ${list.noun} its own id.`));
  }
  return errors;
}

/** Every id in the list and the indexes it appears at, in first-seen order. */
const positionsById = (items: { id: string }[]): Map<string, number[]> => {
  const positions = new Map<string, number[]>();
  items.forEach((item, index) => positions.set(item.id, [...(positions.get(item.id) ?? []), index]));
  return positions;
};

const skillsSection: ListSection = {
  section: 'skills',
  title: 'Skills',
  file: 'skills.json',
  noun: 'Skill',
  namedBy: 'id',
  fieldLabel: fieldLabel({
    id: 'id',
    name: 'name',
    category: 'Category',
  } satisfies Record<keyof Skill, string>),
};

/** What the page calls each Category. */
const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'Language',
  framework: 'Framework',
  tool: 'Tool',
  practice: 'Practice',
};

/** What the Skills rules produced, plus the declared Skills themselves, which Projects reference. */
type SkillsResult = SectionResult<Profile['skills']> & { declared: Skill[] | undefined };

function loadSkills(input: SkillsInput | undefined): SkillsResult {
  const { items: skills, errors } = parseList(skillsSection, skillsSchema, input);
  if (skills === undefined) return { value: undefined, declared: undefined, errors };

  errors.push(...duplicateIdErrors(skillsSection, skills));
  if (errors.length > 0) return { value: undefined, declared: undefined, errors };

  const groups = SKILL_CATEGORIES.map((category) => ({
    category,
    label: SKILL_CATEGORY_LABELS[category],
    skills: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);
  return { value: { renders: skills.length > 0, groups }, declared: skills, errors };
}

const projectsSection: ListSection = {
  section: 'projects',
  title: 'Projects',
  file: 'projects.json',
  noun: 'Project',
  namedBy: 'id',
  fieldLabel: fieldLabel({
    id: 'id',
    name: 'name',
    summary: 'summary',
    description: 'description',
    repoUrl: 'repository URL',
    liveUrl: 'live URL',
    status: 'Status',
    started: 'Started',
    ended: 'Ended',
    skills: 'list of Skills',
  } satisfies Record<keyof Project, string>),
};

const projectsError = errorsIn('projects');

/** How a sentence names a Project that passed field validation: "the tracker Project". */
const projectPhrase = itemPhrase(projectsSection.noun);

/** What the page calls each Status. */
const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

/**
 * The Projects rules. Takes the declared Skills so each Project's Skill ids
 * can be checked and resolved; when the Skills Section itself failed, that
 * rule is skipped, since its errors are already reported.
 */
function loadProjects(
  input: ProjectsInput | undefined,
  declaredSkills: Skill[] | undefined,
): SectionResult<Profile['projects']> {
  const { items: projects, errors } = parseList(projectsSection, projectsSchema, input);
  if (projects === undefined) return { value: undefined, errors };

  errors.push(...duplicateIdErrors(projectsSection, projects));
  const skillsById = new Map((declaredSkills ?? []).map((skill) => [skill.id, skill]));
  if (declaredSkills !== undefined) {
    for (const project of projects) {
      const unknown = project.skills.filter((id) => !skillsById.has(id));
      if (unknown.length === 0) continue;
      const phrase = capitalised(projectPhrase(project.id));
      errors.push(
        projectsError(
          project.id,
          'skills',
          `${phrase} lists a Skill that is not declared: ${unknown.join(', ')}. Add it to skills.json or remove it from the Project.`,
        ),
      );
    }
  }
  for (const project of projects) {
    const fault = statusAndDatesDisagree(project);
    if (fault !== undefined) errors.push(projectsError(project.id, 'ended', `${capitalised(projectPhrase(project.id))} ${fault}`));
  }
  if (errors.length > 0) return { value: undefined, errors };

  const list = [...projects].sort(byActiveThenStartedThenName).map((project) => ({
    ...project,
    statusLabel: PROJECT_STATUS_LABELS[project.status],
    skills: project.skills.map((id) => skillsById.get(id)).filter((skill) => skill !== undefined),
  }));
  return { value: { renders: list.length > 0, list }, errors };
}

/**
 * How a Project's Status, Started and Ended can disagree, as the rest of an
 * error sentence; nothing when they agree. Active has no Ended; Done and
 * Archived require one; Paused may have either; Ended is never before Started.
 */
const statusAndDatesDisagree = ({ status, started, ended }: Project): string | undefined => {
  const label = PROJECT_STATUS_LABELS[status];
  if (status === 'active' && ended !== undefined) {
    return `is ${label} but has an Ended month (${ended}). Remove Ended, or change the Status.`;
  }
  if ((status === 'done' || status === 'archived') && ended === undefined) {
    return `is ${label} but has no Ended month. Add Ended as YYYY-MM, or change the Status.`;
  }
  if (ended !== undefined && isEarlierMonth(ended, started)) {
    return `has an Ended month (${ended}) before its Started month (${started}).`;
  }
  return undefined;
};

/** Whether one month comes before another. Months are `YYYY-MM`, so text order is time order. */
const isEarlierMonth = (month: string, other: string): boolean => month < other;

/** Active first, then most recent Started, then name: the order the page shows Projects in. */
const byActiveThenStartedThenName = (a: Project, b: Project): number => {
  const activeFirst = Number(b.status === 'active') - Number(a.status === 'active');
  if (activeFirst !== 0) return activeFirst;
  if (a.started !== b.started) return isEarlierMonth(a.started, b.started) ? 1 : -1;
  return a.name.localeCompare(b.name);
};

const linksSection: ListSection = {
  section: 'links',
  title: 'Links',
  file: 'links.json',
  noun: 'Link',
  namedBy: 'label',
  fieldLabel: fieldLabel({
    label: 'label',
    url: 'URL',
    isContactChannel: 'Contact Channel mark',
  } satisfies Record<keyof Link, string>),
};

const linksError = errorsIn('links');

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
  const { items: links, errors } = parseList(linksSection, linksSchema, input);
  if (links === undefined) return { value: undefined, errors };

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
