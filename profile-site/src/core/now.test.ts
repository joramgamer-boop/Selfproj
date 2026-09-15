import type { Sections } from './profile';
import { errorsOf, profileOf, validSections } from '../test/fixtures';

/** The Sections with the Now Section replaced by the given raw value, or `undefined` for no file. */
const withNow = (now: unknown): Sections => ({
  ...validSections(),
  now: now === undefined ? undefined : { data: now },
});

describe('the Now Section', () => {
  it('reaches the Profile with its Items in file order, their Kind, and the Updated date', () => {
    const profile = profileOf(
      withNow({
        updated: '2026-09-15',
        items: [
          { kind: 'learning', text: 'Python and SQL' },
          { kind: 'building', text: 'a profile site' },
        ],
      }),
    );

    expect(profile.now).toEqual({
      renders: true,
      updated: '2026-09-15',
      items: [
        { kind: 'learning', text: 'Python and SQL' },
        { kind: 'building', text: 'a profile site' },
      ],
    });
  });
});

describe('an empty Now', () => {
  it('is not an error, and tells the page not to render the Section', () => {
    const profile = profileOf(withNow({ updated: '2026-09-15', items: [] }));

    expect(profile.now).toEqual({ renders: false, updated: '2026-09-15', items: [] });
  });

  it('still needs its Updated date', () => {
    expect(errorsOf(withNow({ items: [] }))).toEqual([
      { section: 'now', item: undefined, field: 'updated', message: "The Now Section's Updated date is missing." },
    ]);
  });
});

describe('the Updated date', () => {
  it.each(['15/09/2026', '2026-9-15', '2026-09-15T00:00', 'yesterday'])(
    'must be written as YYYY-MM-DD: %s is an error naming the field',
    (updated) => {
      expect(errorsOf(withNow({ updated, items: [] }))).toEqual([
        { section: 'now', item: undefined, field: 'updated', message: expect.stringMatching(/Updated date must be .*YYYY-MM-DD/) },
      ]);
    },
  );

  it('must be a real date, not merely the right shape', () => {
    expect(errorsOf(withNow({ updated: '2026-02-30', items: [] }))).toEqual([
      expect.objectContaining({ section: 'now', field: 'updated' }),
    ]);
  });
});

describe('a Now Item', () => {
  const learning = { kind: 'learning', text: 'Python and SQL' };

  it('must have a known Kind: an unknown one is an error naming the Item by index and the field', () => {
    expect(errorsOf(withNow({ updated: '2026-09-15', items: [learning, { kind: 'sleeping', text: 'a lot' }] }))).toEqual([
      {
        section: 'now',
        item: 1,
        field: 'kind',
        message: expect.stringMatching(/index 1 \(the 2nd in the file\).*Kind must be one of learning, building, reading, other/),
      },
    ]);
  });

  it('must have text: empty or whitespace text is an error naming the Item by index and the field', () => {
    expect(errorsOf(withNow({ updated: '2026-09-15', items: [{ kind: 'building', text: '   ' }, learning] }))).toEqual([
      { section: 'now', item: 0, field: 'text', message: expect.stringMatching(/index 0 \(the 1st in the file\).*text is empty/) },
    ]);
  });

  it('reports every missing field together, each naming the Item', () => {
    expect(errorsOf(withNow({ updated: '2026-09-15', items: [{}] }))).toEqual([
      { section: 'now', item: 0, field: 'kind', message: expect.stringMatching(/Kind is missing/) },
      { section: 'now', item: 0, field: 'text', message: expect.stringMatching(/text is missing/) },
    ]);
  });
});

describe('the Now file', () => {
  it('must be present', () => {
    expect(errorsOf(withNow(undefined))).toEqual([
      { section: 'now', item: undefined, field: 'file', message: expect.stringMatching(/now .*missing/i) },
    ]);
  });

  it('must hold a list of Items under items, not anything else', () => {
    expect(errorsOf(withNow({ updated: '2026-09-15', items: { kind: 'learning', text: 'x' } }))).toEqual([
      { section: 'now', item: undefined, field: 'items', message: expect.stringMatching(/list of Now Items/) },
    ]);
  });
});

describe('the list of Items', () => {
  it('must be present, even when empty', () => {
    expect(errorsOf(withNow({ updated: '2026-09-15' }))).toEqual([
      { section: 'now', item: undefined, field: 'items', message: "The Now Section's list of Items is missing." },
    ]);
  });
});
