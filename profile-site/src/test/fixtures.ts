import { loadProfile, type ContentError, type Profile, type Sections } from '../core/profile';

/**
 * Content with nothing wrong, for tests at the loader seam. Each test breaks
 * one thing in one Section and leaves the others as they are here.
 */

/** A Bio with nothing wrong. */
export const aBio = () => ({
  data: { firstName: 'Ada', handle: 'ada-l', tagline: 'Makes engines think.' },
  body: 'Studies at a university and expects to graduate in 2028.\n',
});

/** The one Link a Visitor is invited to use, as `someLinks()` marks it. */
export const theContactChannel = () => ({
  label: 'LinkedIn',
  url: 'https://www.linkedin.com/in/ada-l',
  isContactChannel: true,
});

/** A Links Section with two Links, the second being the Contact Channel. */
export const someLinks = () => ({
  data: [{ label: 'GitHub', url: 'https://github.com/ada-l', isContactChannel: false }, theContactChannel()],
});

/** Every Section with nothing wrong. */
export const validSections = (): Sections => ({ bio: aBio(), links: someLinks() });

/** The loader's errors for these Sections; fails the test if it returned a Profile instead. */
export const errorsOf = (sections: Sections): ContentError[] => {
  const result = loadProfile(sections);
  if (result.ok) throw new Error('expected the loader to return errors, it returned a Profile');
  return result.errors;
};

/** The loader's Profile for these Sections; fails the test, showing the errors, if it returned errors instead. */
export const profileOf = (sections: Sections): Profile => {
  const result = loadProfile(sections);
  if (!result.ok) throw new Error(`expected a Profile, got errors:\n${JSON.stringify(result.errors, null, 2)}`);
  return result.profile;
};
