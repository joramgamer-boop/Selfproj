import type { Sections } from './profile';
import { errorsOf, profileOf, validSections } from '../test/fixtures';

/**
 * The Sections with the Skills Section replaced by the given raw list, or
 * `undefined` for no file. The Projects are emptied, so no Project references a
 * Skill these tests chose not to declare; that rule has its own tests.
 */
const withSkills = (skills: unknown): Sections => ({
  ...validSections(),
  projects: { data: [] },
  skills: skills === undefined ? undefined : { data: skills },
});

const python = { id: 'python', name: 'Python', category: 'language' };
const sql = { id: 'sql', name: 'SQL', category: 'language' };
const react = { id: 'react', name: 'React', category: 'framework' };
const git = { id: 'git', name: 'Git', category: 'tool' };
const tdd = { id: 'tdd', name: 'Test-driven development', category: 'practice' };

describe('the Skills', () => {
  it('reach the Profile grouped by Category in the fixed order Language, Framework, Tool, Practice, whatever the file order', () => {
    const profile = profileOf(withSkills([tdd, git, react, python, sql]));

    expect(profile.skills).toEqual({
      renders: true,
      groups: [
        { category: 'language', label: 'Language', skills: [python, sql] },
        { category: 'framework', label: 'Framework', skills: [react] },
        { category: 'tool', label: 'Tool', skills: [git] },
        { category: 'practice', label: 'Practice', skills: [tdd] },
      ],
    });
  });

  it('keep file order inside a group', () => {
    const profile = profileOf(withSkills([sql, python]));

    expect(profile.skills.groups).toEqual([{ category: 'language', label: 'Language', skills: [sql, python] }]);
  });

  it('omit a Category with no Skills instead of showing an empty group', () => {
    const profile = profileOf(withSkills([git, python]));

    expect(profile.skills.groups.map((group) => group.category)).toEqual(['language', 'tool']);
  });
});

describe('an empty Skills Section', () => {
  it('is not an error, and tells the page not to render the Section', () => {
    expect(profileOf(withSkills([])).skills).toEqual({ renders: false, groups: [] });
  });
});

describe('a Skill', () => {
  it('must have a known Category: an unknown one is an error naming the Skill and the field', () => {
    expect(errorsOf(withSkills([python, { id: 'vite', name: 'Vite', category: 'bundler' }]))).toEqual([
      {
        section: 'skills',
        item: 'vite',
        field: 'category',
        message: expect.stringMatching(/vite.*Category must be one of language, framework, tool, practice/),
      },
    ]);
  });

  it('must have a name: a missing or empty one is an error naming the Skill and the field', () => {
    expect(errorsOf(withSkills([{ id: 'python', category: 'language' }]))).toEqual([
      { section: 'skills', item: 'python', field: 'name', message: expect.stringMatching(/python.*name is missing/) },
    ]);
    expect(errorsOf(withSkills([{ id: 'python', name: '  ', category: 'language' }]))).toEqual([
      { section: 'skills', item: 'python', field: 'name', message: expect.stringMatching(/name is empty/) },
    ]);
  });

  it.each(['Python', 'test driven', 'c++', '-sql', 'sql-', 'a--b'])(
    'must have an id that is a slug: %s is an error naming the Skill and the field',
    (id) => {
      expect(errorsOf(withSkills([{ id, name: 'Something', category: 'language' }]))).toEqual([
        { section: 'skills', item: id, field: 'id', message: expect.stringMatching(/id must be a slug/) },
      ]);
    },
  );

  it('is named by its index, and its place in the file, when its id is unusable; every field error comes together', () => {
    expect(errorsOf(withSkills([python, { name: 'Git' }]))).toEqual([
      { section: 'skills', item: 1, field: 'id', message: expect.stringMatching(/index 1 \(the 2nd in the file\).*id is missing/) },
      { section: 'skills', item: 1, field: 'category', message: expect.stringMatching(/Category is missing/) },
    ]);
  });

  it('carries no level, rating or years: such a field never reaches the Profile', () => {
    const profile = profileOf(withSkills([{ ...python, rating: 5, years: 3 }]));

    expect(profile.skills.groups).toEqual([{ category: 'language', label: 'Language', skills: [python] }]);
  });
});

describe('Skill ids', () => {
  it('must be unique: a duplicate is an error naming the id and both positions', () => {
    expect(errorsOf(withSkills([python, git, { ...python, name: 'Python 3' }]))).toEqual([
      { section: 'skills', item: 'python', field: 'id', message: expect.stringMatching(/python.*index 0.*index 2/) },
    ]);
  });

  it('report every duplicate together', () => {
    expect(errorsOf(withSkills([python, git, python, git]))).toEqual([
      expect.objectContaining({ item: 'python', field: 'id' }),
      expect.objectContaining({ item: 'git', field: 'id' }),
    ]);
  });
});

describe('the Skills file', () => {
  it('must be present', () => {
    expect(errorsOf(withSkills(undefined))).toEqual([
      { section: 'skills', item: undefined, field: 'file', message: expect.stringMatching(/skills .*missing/i) },
    ]);
  });

  it('must hold a list, not anything else', () => {
    expect(errorsOf(withSkills({ id: 'python' }))).toEqual([
      { section: 'skills', item: undefined, field: 'file', message: expect.stringMatching(/list of Skills/) },
    ]);
  });
});
