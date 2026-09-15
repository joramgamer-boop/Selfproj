import type { Sections } from './profile';
import { profileOf, someProjects, validSections } from '../test/fixtures';

/** The valid Projects with no Skills listed, so they stay valid when the Skills Section is empty. */
const projectsUsingNoSkills = () => ({
  data: someProjects().data.map((project) => ({ ...project, skills: [] })),
});

/**
 * The Sections with the given optional ones emptied, so they hide. Bio and
 * Links have no empty form. Emptying Skills also unlists them from the
 * Projects, since a Project may only list declared Skills.
 */
const withEmpty = (...empty: ('now' | 'projects' | 'skills')[]): Sections => ({
  ...validSections(),
  ...(empty.includes('now') ? { now: { data: { updated: '2026-09-01', items: [] } } } : {}),
  ...(empty.includes('skills') ? { skills: { data: [] }, projects: projectsUsingNoSkills() } : {}),
  ...(empty.includes('projects') ? { projects: { data: [] } } : {}),
});

describe('the Sections that render', () => {
  it('are listed in the fixed order Bio, Now, Projects, Skills, Links, each with its id and title', () => {
    expect(profileOf(validSections()).sections).toEqual([
      { id: 'bio', title: 'Bio' },
      { id: 'now', title: 'Now' },
      { id: 'projects', title: 'Projects' },
      { id: 'skills', title: 'Skills' },
      { id: 'links', title: 'Links' },
    ]);
  });
});

describe('a hidden Section', () => {
  it.each(['now', 'projects', 'skills'] as const)('%s is absent from the list when it has nothing to show', (hidden) => {
    const ids = profileOf(withEmpty(hidden)).sections.map((section) => section.id);

    expect(ids).not.toContain(hidden);
    expect(ids).toHaveLength(4);
  });

  it('leaves the others in the fixed order', () => {
    expect(profileOf(withEmpty('now', 'skills')).sections).toEqual([
      { id: 'bio', title: 'Bio' },
      { id: 'projects', title: 'Projects' },
      { id: 'links', title: 'Links' },
    ]);
  });
});

describe('Bio and Links', () => {
  it('are always present, first and last, even when every optional Section is hidden', () => {
    expect(profileOf(withEmpty('now', 'projects', 'skills')).sections).toEqual([
      { id: 'bio', title: 'Bio' },
      { id: 'links', title: 'Links' },
    ]);
  });
});
