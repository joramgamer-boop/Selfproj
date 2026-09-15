import type { Sections } from './profile';
import { errorsOf, profileOf, validSections } from '../test/fixtures';

/** The Sections with the Projects Section replaced by the given raw list, or `undefined` for no file. */
const withProjects = (projects: unknown): Sections => ({
  ...validSections(),
  projects: projects === undefined ? undefined : { data: projects },
});

/** A Project with nothing wrong, Active since a month ago, using two declared Skills. */
const aProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'engine',
  name: 'Engine',
  summary: 'Makes things go.',
  status: 'active',
  started: '2026-08',
  skills: ['python', 'tdd'],
  ...overrides,
});

describe('the Projects', () => {
  it('reach the Profile Active first, then by most recent Started, ties broken by name, whatever the file order', () => {
    const profile = profileOf(
      withProjects([
        aProject({ id: 'old-done', name: 'Old', status: 'done', started: '2025-01', ended: '2025-03' }),
        aProject({ id: 'newer-paused', name: 'Newer', status: 'paused', started: '2026-05' }),
        aProject({ id: 'active-early', name: 'Early active', status: 'active', started: '2024-01' }),
        aProject({ id: 'zebra', name: 'Zebra', status: 'archived', started: '2026-05', ended: '2026-06' }),
        aProject({ id: 'apple', name: 'Apple', status: 'done', started: '2026-05', ended: '2026-06' }),
        aProject({ id: 'active-late', name: 'Late active', status: 'active', started: '2026-08' }),
      ]),
    );

    expect(profile.projects.list.map((project) => project.id)).toEqual([
      'active-late',
      'active-early',
      'apple',
      'newer-paused',
      'zebra',
      'old-done',
    ]);
  });
});

describe('a Project and its Skills', () => {
  it('must list only declared Skills: an unknown id is an error naming the Project, the field and the Skill', () => {
    expect(errorsOf(withProjects([aProject({ skills: ['python', 'vitest'] })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'skills', message: expect.stringMatching(/engine.*vitest/) },
    ]);
  });
});

describe('Project ids', () => {
  it('must be unique: a duplicate is an error naming the id and both positions', () => {
    expect(
      errorsOf(withProjects([aProject(), aProject({ id: 'other', name: 'Other' }), aProject({ name: 'Engine 2' })])),
    ).toEqual([
      { section: 'projects', item: 'engine', field: 'id', message: expect.stringMatching(/engine.*index 0.*index 2/) },
    ]);
  });
});

describe("a Project's Status and dates", () => {
  it('must agree in time: Ended before Started is an error naming the Project and Ended', () => {
    expect(errorsOf(withProjects([aProject({ status: 'done', started: '2026-03', ended: '2026-02' })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'ended', message: expect.stringMatching(/engine.*Ended.*2026-02.*before.*Started.*2026-03/) },
    ]);
  });

  it('may end in the month it started', () => {
    const profile = profileOf(withProjects([aProject({ status: 'done', started: '2026-03', ended: '2026-03' })]));

    expect(profile.projects.list[0]?.ended).toBe('2026-03');
  });

  it('must agree in Status: Active with an Ended month is an error naming the Project and Ended', () => {
    expect(errorsOf(withProjects([aProject({ status: 'active', ended: '2026-09' })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'ended', message: expect.stringMatching(/engine.*Active.*Ended/) },
    ]);
  });

  it.each(['done', 'archived'])('must agree in Status: %s without an Ended month is an error naming the Project and Ended', (status) => {
    expect(errorsOf(withProjects([aProject({ status })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'ended', message: expect.stringMatching(/engine.*Ended/) },
    ]);
  });

  it('may be Paused with an Ended month', () => {
    const profile = profileOf(withProjects([aProject({ status: 'paused', ended: '2026-09' })]));

    expect(profile.projects.list[0]).toMatchObject({ status: 'paused', statusLabel: 'Paused', ended: '2026-09' });
  });

  it('may be Paused without an Ended month', () => {
    const profile = profileOf(withProjects([aProject({ status: 'paused' })]));

    expect(profile.projects.list[0]).toMatchObject({ status: 'paused', statusLabel: 'Paused' });
    expect(profile.projects.list[0]).not.toHaveProperty('ended');
  });
});

describe('a Project in the Profile', () => {
  it('carries its Skills resolved to the declared Skills, in the order listed, and its Status labelled', () => {
    const profile = profileOf(withProjects([aProject({ skills: ['tdd', 'python'] })]));

    expect(profile.projects.list).toEqual([
      {
        id: 'engine',
        name: 'Engine',
        summary: 'Makes things go.',
        status: 'active',
        statusLabel: 'Active',
        started: '2026-08',
        skills: [
          { id: 'tdd', name: 'Test-driven development', category: 'practice' },
          { id: 'python', name: 'Python', category: 'language' },
        ],
      },
    ]);
  });

  it('keeps its description, repository link and live link when written', () => {
    const profile = profileOf(
      withProjects([
        aProject({
          description: 'A longer paragraph.',
          repoUrl: 'https://github.com/ada-l/engine',
          liveUrl: 'https://engine.example.com/',
        }),
      ]),
    );

    expect(profile.projects.list[0]).toMatchObject({
      description: 'A longer paragraph.',
      repoUrl: 'https://github.com/ada-l/engine',
      liveUrl: 'https://engine.example.com/',
    });
  });
});

describe('an empty Projects Section', () => {
  it('is not an error, and tells the page not to render the Section', () => {
    expect(profileOf(withProjects([])).projects).toEqual({ renders: false, list: [] });
  });
});

describe('a Project', () => {
  it('must have a known Status: an unknown one is an error naming the Project and the field', () => {
    expect(errorsOf(withProjects([aProject({ status: 'shipped' })]))).toEqual([
      {
        section: 'projects',
        item: 'engine',
        field: 'status',
        message: expect.stringMatching(/engine.*Status must be one of active, paused, done, archived/),
      },
    ]);
  });

  it.each(['2026', '2026-8', '2026-13', '2026-08-01', 'August 2026'])(
    'must write Started as YYYY-MM: %s is an error naming the Project and the field',
    (started) => {
      expect(errorsOf(withProjects([aProject({ started })]))).toEqual([
        { section: 'projects', item: 'engine', field: 'started', message: expect.stringMatching(/engine.*Started must be .*YYYY-MM/) },
      ]);
    },
  );

  it('must write Ended as YYYY-MM too', () => {
    expect(errorsOf(withProjects([aProject({ status: 'done', ended: '2026-09-01' })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'ended', message: expect.stringMatching(/Ended must be .*YYYY-MM/) },
    ]);
  });

  it.each(['repoUrl', 'liveUrl'])('must have an absolute URL in %s when it has one', (field) => {
    expect(errorsOf(withProjects([aProject({ [field]: '/engine' })]))).toEqual([
      { section: 'projects', item: 'engine', field, message: expect.stringMatching(/engine.*absolute URL/) },
    ]);
  });

  it('must have an id that is a slug', () => {
    expect(errorsOf(withProjects([aProject({ id: 'My Engine' })]))).toEqual([
      { section: 'projects', item: 'My Engine', field: 'id', message: expect.stringMatching(/id must be a slug/) },
    ]);
  });

  it('is named by its index, and its place in the file, when its id is unusable; every field error comes together', () => {
    expect(errorsOf(withProjects([aProject(), { name: 'Bare' }]))).toEqual([
      { section: 'projects', item: 1, field: 'id', message: expect.stringMatching(/index 1 \(the 2nd in the file\).*id is missing/) },
      { section: 'projects', item: 1, field: 'summary', message: expect.stringMatching(/summary is missing/) },
      { section: 'projects', item: 1, field: 'status', message: expect.stringMatching(/Status is missing/) },
      { section: 'projects', item: 1, field: 'started', message: expect.stringMatching(/Started is missing/) },
      { section: 'projects', item: 1, field: 'skills', message: expect.stringMatching(/list of Skills is missing/) },
    ]);
  });

  it('names a Skill id that is not a slug by its place in the list', () => {
    expect(errorsOf(withProjects([aProject({ skills: ['python', 'Not A Slug'] })]))).toEqual([
      { section: 'projects', item: 'engine', field: 'skills.1', message: expect.stringMatching(/must be a slug/) },
    ]);
  });
});

describe('the Projects file', () => {
  it('must be present', () => {
    expect(errorsOf(withProjects(undefined))).toEqual([
      { section: 'projects', item: undefined, field: 'file', message: expect.stringMatching(/projects .*missing/i) },
    ]);
  });

  it('must hold a list, not anything else', () => {
    expect(errorsOf(withProjects({ id: 'engine' }))).toEqual([
      { section: 'projects', item: undefined, field: 'file', message: expect.stringMatching(/list of Projects/) },
    ]);
  });
});
