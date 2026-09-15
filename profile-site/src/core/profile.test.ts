import { loadProfile, type ContentError, type Sections } from './profile';

/** A Bio with nothing wrong. Every test below breaks one thing in it. */
const aBio = () => ({
  data: { firstName: 'Ada', handle: 'ada-l', tagline: 'Makes engines think.' },
  body: 'Studies at a university and expects to graduate in 2028.\n',
});

/** The Bio with some of its frontmatter changed or dropped: the value of a field, or `undefined` to omit it. */
const bioWith = (data: Record<string, unknown>) => ({ ...aBio(), data: { ...aBio().data, ...data } });

const errorsOf = (sections: Sections): ContentError[] => {
  const result = loadProfile(sections);
  if (result.ok) throw new Error('expected the loader to return errors, it returned a Profile');
  return result.errors;
};

describe('the Bio', () => {
  it('becomes the Profile: Display Name from first name and Handle, Tagline and prose as written', () => {
    expect(loadProfile({ bio: aBio() })).toEqual({
      ok: true,
      profile: {
        displayName: 'Ada (ada-l)',
        bio: {
          firstName: 'Ada',
          handle: 'ada-l',
          tagline: 'Makes engines think.',
          prose: 'Studies at a university and expects to graduate in 2028.',
        },
      },
    });
  });

  it('must be present', () => {
    expect(errorsOf({ bio: undefined })).toEqual([
      { section: 'bio', item: undefined, field: 'file', message: expect.stringMatching(/bio is missing/i) },
    ]);
  });

  it('must have prose, and whitespace is not prose', () => {
    expect(errorsOf({ bio: { ...aBio(), body: '' } })).toEqual([
      { section: 'bio', item: undefined, field: 'body', message: expect.stringMatching(/no prose/i) },
    ]);
    expect(errorsOf({ bio: { ...aBio(), body: '  \n\n' } })).toEqual([
      expect.objectContaining({ section: 'bio', field: 'body' }),
    ]);
  });

  it('must have a Tagline', () => {
    expect(errorsOf({ bio: bioWith({ tagline: undefined }) })).toEqual([
      { section: 'bio', item: undefined, field: 'tagline', message: "The Bio's Tagline is missing." },
    ]);
  });

  it('must have a Tagline with something in it', () => {
    expect(errorsOf({ bio: bioWith({ tagline: '   ' }) })).toEqual([
      { section: 'bio', item: undefined, field: 'tagline', message: "The Bio's Tagline is empty." },
    ]);
  });

  it('must have a first name and a Handle', () => {
    expect(errorsOf({ bio: { ...aBio(), data: { tagline: 'Still here.' } } })).toEqual([
      { section: 'bio', item: undefined, field: 'firstName', message: "The Bio's first name is missing." },
      { section: 'bio', item: undefined, field: 'handle', message: "The Bio's Handle is missing." },
    ]);
  });

  it('refuses a field that is not text, naming the field', () => {
    expect(errorsOf({ bio: bioWith({ handle: 42 }) })).toEqual([
      { section: 'bio', item: undefined, field: 'handle', message: "The Bio's Handle must be text." },
    ]);
  });
});

describe('how the loader reports errors', () => {
  it('names the Section, no item for a single-file Section, the field, and says it in a sentence', () => {
    const [error] = errorsOf({ bio: bioWith({ tagline: undefined }) });

    expect(error).toEqual({
      section: 'bio',
      item: undefined,
      field: 'tagline',
      message: expect.stringMatching(/^[A-Z].*\.$/),
    });
  });

  it('returns every error together, never only the first', () => {
    const errors = errorsOf({ bio: { data: { firstName: 'Ada' }, body: '' } });

    expect(errors.map((error) => error.field)).toEqual(['handle', 'tagline', 'body']);
  });

  it('never returns a Profile alongside errors', () => {
    const result = loadProfile({ bio: { ...aBio(), body: '' } });

    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('profile');
  });
});
