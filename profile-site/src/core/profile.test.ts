import { loadProfile, type Sections } from './profile';
import { aBio, aNow, errorsOf, someLinks, someSkills, theContactChannel, validSections } from '../test/fixtures';

/** The Sections with the Bio replaced, or dropped with `undefined`. */
const withBio = (bio: Sections['bio']): Sections => ({ ...validSections(), bio });

/** The Bio with some of its frontmatter changed or dropped: the value of a field, or `undefined` to omit it. */
const bioWith = (data: Record<string, unknown>) => ({ ...aBio(), data: { ...aBio().data, ...data } });

describe('the Bio', () => {
  it('becomes the Profile: Display Name from first name and Handle, Tagline and prose as written', () => {
    expect(loadProfile({ bio: aBio(), now: aNow(), skills: someSkills(), links: someLinks() })).toEqual({
      ok: true,
      profile: {
        displayName: 'Ada (ada-l)',
        bio: {
          firstName: 'Ada',
          handle: 'ada-l',
          tagline: 'Makes engines think.',
          prose: 'Studies at a university and expects to graduate in 2028.',
        },
        now: { renders: true, ...aNow().data },
        skills: {
          renders: true,
          groups: [
            { category: 'language', label: 'Language', skills: [{ id: 'python', name: 'Python', category: 'language' }] },
            { category: 'framework', label: 'Framework', skills: [{ id: 'react', name: 'React', category: 'framework' }] },
            { category: 'tool', label: 'Tool', skills: [{ id: 'git', name: 'Git', category: 'tool' }] },
            {
              category: 'practice',
              label: 'Practice',
              skills: [{ id: 'tdd', name: 'Test-driven development', category: 'practice' }],
            },
          ],
        },
        links: someLinks().data,
        contactChannel: theContactChannel(),
      },
    });
  });

  it('must be present', () => {
    expect(errorsOf(withBio(undefined))).toEqual([
      { section: 'bio', item: undefined, field: 'file', message: expect.stringMatching(/bio is missing/i) },
    ]);
  });

  it('must have prose, and whitespace is not prose', () => {
    expect(errorsOf(withBio({ ...aBio(), body: '' }))).toEqual([
      { section: 'bio', item: undefined, field: 'body', message: expect.stringMatching(/no prose/i) },
    ]);
    expect(errorsOf(withBio({ ...aBio(), body: '  \n\n' }))).toEqual([
      expect.objectContaining({ section: 'bio', field: 'body' }),
    ]);
  });

  it('must have a Tagline', () => {
    expect(errorsOf(withBio(bioWith({ tagline: undefined })))).toEqual([
      { section: 'bio', item: undefined, field: 'tagline', message: "The Bio's Tagline is missing." },
    ]);
  });

  it('must have a Tagline with something in it', () => {
    expect(errorsOf(withBio(bioWith({ tagline: '   ' })))).toEqual([
      { section: 'bio', item: undefined, field: 'tagline', message: "The Bio's Tagline is empty." },
    ]);
  });

  it('must have a first name and a Handle', () => {
    expect(errorsOf(withBio({ ...aBio(), data: { tagline: 'Still here.' } }))).toEqual([
      { section: 'bio', item: undefined, field: 'firstName', message: "The Bio's first name is missing." },
      { section: 'bio', item: undefined, field: 'handle', message: "The Bio's Handle is missing." },
    ]);
  });

  it('refuses a field that is not text, naming the field', () => {
    expect(errorsOf(withBio(bioWith({ handle: 42 })))).toEqual([
      { section: 'bio', item: undefined, field: 'handle', message: "The Bio's Handle must be text." },
    ]);
  });
});

describe('how the loader reports errors', () => {
  it('names the Section, no item for a single-file Section, the field, and says it in a sentence', () => {
    const [error] = errorsOf(withBio(bioWith({ tagline: undefined })));

    expect(error).toEqual({
      section: 'bio',
      item: undefined,
      field: 'tagline',
      message: expect.stringMatching(/^[A-Z].*\.$/),
    });
  });

  it('returns every error together, never only the first', () => {
    const errors = errorsOf(withBio({ data: { firstName: 'Ada' }, body: '' }));

    expect(errors.map((error) => error.field)).toEqual(['handle', 'tagline', 'body']);
  });

  it('returns the errors of every Section together, in page order, not one Section at a time', () => {
    const errors = errorsOf({ bio: undefined, now: { data: { items: [] } }, skills: undefined, links: { data: [] } });

    expect(errors.map((error) => error.section)).toEqual(['bio', 'now', 'skills', 'links']);
  });

  it('never returns a Profile alongside errors', () => {
    const result = loadProfile(withBio({ ...aBio(), body: '' }));

    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('profile');
  });
});
