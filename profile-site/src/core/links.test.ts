import type { Sections } from './profile';
import { errorsOf, profileOf, validSections } from '../test/fixtures';

/** The Sections with the Links Section replaced by the given raw list, or `undefined` for no file. */
const withLinks = (links: unknown): Sections => ({
  ...validSections(),
  links: links === undefined ? undefined : { data: links },
});

const github = { label: 'GitHub', url: 'https://github.com/ada-l' };
const linkedin = { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ada-l' };
const mastodon = { label: 'Mastodon', url: 'https://mastodon.social/@ada-l' };

describe('the Links', () => {
  it('reach the Profile in the order written, with the Contact Channel as its own field', () => {
    const profile = profileOf(
      withLinks([
        { ...github, isContactChannel: false },
        { ...linkedin, isContactChannel: true },
      ]),
    );

    expect(profile.links).toEqual([
      { label: 'GitHub', url: 'https://github.com/ada-l', isContactChannel: false },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ada-l', isContactChannel: true },
    ]);
    expect(profile.contactChannel).toEqual({
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/ada-l',
      isContactChannel: true,
    });
  });
});

describe('the Links Section', () => {
  it('must be present', () => {
    expect(errorsOf(withLinks(undefined))).toEqual([
      { section: 'links', item: undefined, field: 'file', message: expect.stringMatching(/links .*missing/i) },
    ]);
  });

  it('must not be empty', () => {
    expect(errorsOf(withLinks([]))).toEqual([
      { section: 'links', item: undefined, field: 'file', message: expect.stringMatching(/links .*empty/i) },
    ]);
  });

  it('must hold a list, not anything else', () => {
    expect(errorsOf(withLinks({ label: 'GitHub' }))).toEqual([
      { section: 'links', item: undefined, field: 'file', message: expect.stringMatching(/list of Links/) },
    ]);
  });
});

describe('the Contact Channel', () => {
  it('must be exactly one Link: none is an error naming the Section and the field', () => {
    expect(
      errorsOf(withLinks([{ ...github, isContactChannel: false }, { ...linkedin, isContactChannel: false }])),
    ).toEqual([
      {
        section: 'links',
        item: undefined,
        field: 'isContactChannel',
        message: expect.stringMatching(/no link is the contact channel/i),
      },
    ]);
  });

  it('must be exactly one Link: two is an error naming both offending Links by label', () => {
    expect(
      errorsOf(
        withLinks([
          { ...github, isContactChannel: true },
          { ...mastodon, isContactChannel: false },
          { ...linkedin, isContactChannel: true },
        ]),
      ),
    ).toEqual([
      {
        section: 'links',
        item: undefined,
        field: 'isContactChannel',
        message: expect.stringMatching(/GitHub.*LinkedIn/),
      },
    ]);
  });

  it('is exactly one Link: that Link becomes the Contact Channel', () => {
    const profile = profileOf(withLinks([{ ...github, isContactChannel: true }, { ...linkedin, isContactChannel: false }]));

    expect(profile.contactChannel.label).toBe('GitHub');
  });
});

describe('a Link', () => {
  const contact = { ...linkedin, isContactChannel: true };

  it('must have an absolute URL: a relative one is an error naming the Link and the field', () => {
    expect(errorsOf(withLinks([contact, { label: 'GitHub', url: '/ada-l', isContactChannel: false }]))).toEqual([
      { section: 'links', item: 'GitHub', field: 'url', message: expect.stringMatching(/GitHub.*absolute URL/) },
    ]);
  });

  it('must have an absolute URL: one with no scheme is an error too', () => {
    expect(errorsOf(withLinks([contact, { label: 'GitHub', url: 'github.com/ada-l', isContactChannel: false }]))).toEqual([
      expect.objectContaining({ section: 'links', item: 'GitHub', field: 'url' }),
    ]);
  });

  it('must have a web URL: a mailto address is not a Link', () => {
    expect(errorsOf(withLinks([contact, { label: 'Email', url: 'mailto:ada@example.com', isContactChannel: false }]))).toEqual([
      expect.objectContaining({ section: 'links', item: 'Email', field: 'url' }),
    ]);
  });

  it('is named by its index, and its place in the file, when its label is unusable; every field error comes together', () => {
    expect(errorsOf(withLinks([contact, { url: 'https://github.com/ada-l' }, { label: 'X', url: 'https://x.com/ada' }]))).toEqual([
      { section: 'links', item: 1, field: 'label', message: expect.stringMatching(/index 1 \(the 2nd in the file\).*label is missing/i) },
      { section: 'links', item: 1, field: 'isContactChannel', message: expect.stringMatching(/is missing/i) },
      { section: 'links', item: 'X', field: 'isContactChannel', message: expect.stringMatching(/is missing/i) },
    ]);
  });

  it('marks the Contact Channel with true or false, not anything else', () => {
    expect(errorsOf(withLinks([{ ...contact, isContactChannel: 'yes' }]))).toEqual([
      { section: 'links', item: 'LinkedIn', field: 'isContactChannel', message: expect.stringMatching(/true or false/) },
    ]);
  });
});
