# Spec: Profile Site

Status: ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Decisions: `profile-site/docs/adr/`.
Seed content: `.scratch/profile-site/seed.md`.

## Problem Statement

I have facts about myself scattered across LinkedIn, a GitHub account and my
own head, and no single place that I control where they are written down and
shown. LinkedIn owns the shape of my profile, hides most of it behind a login
wall, and gives me no way to say "this is what I'm doing right now" or to list
the things I've actually built. When I want to point someone at who I am, I
have nothing of my own to point at.

I'm also learning a way of working: grill the idea, write a spec, cut it into
tickets, build test-first. I want a project small enough to run that whole
flow end to end and finish it, but with a real domain in it so the spec and the
tests have something to say.

## Solution

A one-page site, published from this repository, that shows a curated Profile
of me: a Bio with a Tagline, a Now Section, my Projects, my Skills and my
Links. The Profile is stored as files in the repository. I edit a file, commit,
and the site rebuilds and publishes itself. Nothing invalid ever reaches the
live site: a broken content file fails the build and says exactly what is
wrong.

The page is mine first and a recruiter's second. It shows my first name and
handle, names my university and expected graduation, and offers exactly one
way to reach me. It never shows my full name, email address, phone number,
birth date or city.

Visual design is a separate, later pass. This spec covers content, structure
and behaviour only, and the page's markup is provisional until that pass runs.

## User Stories

### Reading the Profile

1. As a Visitor, I want to open one page and read everything the Owner chose to show, so that I don't have to navigate to find out who they are.
2. As a Visitor, I want to see the Owner's Display Name at the top, so that I know whose page I'm on.
3. As a Visitor, I want to read the Tagline before anything else, so that I get the one-line version of the Owner immediately.
4. As a Visitor, I want to read the Bio as prose, so that I learn who the Owner is, where they study and when they expect to graduate.
5. As a Visitor, I want to see what the Owner is doing now, so that I know what they're currently learning and building rather than only what they've finished.
6. As a Visitor, I want to see when Now was last Updated, so that I can judge how current it is.
7. As a Visitor, I want to see the Owner's Projects with a one-line summary each, so that I can scan what they've made.
8. As a Visitor, I want to see each Project's Status, so that I know whether it's live work or finished work.
9. As a Visitor, I want to see when each Project was Started and, if finished, Ended, so that I can place it in time.
10. As a Visitor, I want to follow a Project's repository link or live link when it has one, so that I can see the real thing.
11. As a Visitor, I want to see which Skills each Project used, so that the Skills list is backed by evidence.
12. As a Visitor, I want to see the Owner's Skills grouped by Category, so that I can tell a language from a tool from a practice.
13. As a Visitor, I want the Skills list to carry no self-ratings, so that I'm not asked to trust a number nobody can check.
14. As a Visitor, I want to see the Owner's Links, so that I can find them elsewhere on the web.
15. As a Visitor, I want one Link clearly marked as the way to contact the Owner, so that I don't guess which channel they actually read.
16. As a Visitor, I want to jump between Sections with in-page links, so that I can go straight to Projects or Links on a long page.
17. As a Visitor, I want the page to read in a fixed order (Bio, Now, Projects, Skills, Links), so that the story goes who, what now, what made, what able, where found.
18. As a Visitor, I want the browser tab and search results to show the Display Name and the Tagline, so that the page identifies itself before I open it.
19. As a Visitor, I want the page to work on a phone, so that I can read it wherever a link reaches me.
20. As a Visitor, I want no cookie banner, tracker or analytics script, so that reading the page costs me nothing.

### Editing the Profile

21. As the Owner, I want the Profile stored as files in the repository, so that editing it is editing a file and publishing it is committing.
22. As the Owner, I want one file per Section, so that a change to Now is a one-file diff and doesn't touch Projects.
23. As the Owner, I want the Bio written in Markdown, so that prose is prose and not a JSON string.
24. As the Owner, I want the structured Sections written as JSON, so that they are easy to edit by hand and easy to validate.
25. As the Owner, I want to write Now as a short list of Items with a Kind, so that updating it takes thirty seconds.
26. As the Owner, I want to set the Updated date myself when I edit Now, so that the date means "I looked at this" and not "a file changed".
27. As the Owner, I want to add a Project by writing its name, summary, Status, Started month and Skills, so that listing something new is a few lines.
28. As the Owner, I want the Projects list to be exactly what I wrote and never derived from folders in the repository, so that a Project is a claim I chose to make.
29. As the Owner, I want Active Projects shown first and the rest by most recent Started, so that I never have to reorder the file by hand.
30. As the Owner, I want to mark a Project Paused, Done or Archived, so that old work stays listed without pretending to be current.
31. As the Owner, I want to reference Skills from a Project by a stable id, so that renaming a Skill's display name doesn't silently break the link.
32. As the Owner, I want to write months as `YYYY-MM`, so that I never have to invent a day.
33. As the Owner, I want to mark exactly one Link as the Contact Channel, so that the page never offers two ways to reach me or none.
34. As the Owner, I want a Section with no items to disappear from the page rather than show an empty heading, so that a quiet month in Now doesn't look like neglect.

### Being told when content is wrong

35. As the Owner, I want the build to fail when a content file is malformed, so that a typo never reaches the live site.
36. As the Owner, I want the failure to name the file, the item and the field, so that I can fix it without reading the schema.
37. As the Owner, I want the build to fail when a Project lists a Skill that isn't in the Skills Section, so that every Skill on the page is one I actually declared.
38. As the Owner, I want the build to fail when a Project's Ended month is before its Started month, so that dates on the page are always coherent.
39. As the Owner, I want the build to fail when a Project has a Status of Done or Archived and no Ended month, or a Status of Active and an Ended month, so that Status and dates agree.
40. As the Owner, I want the build to fail when zero Links or more than one Link is marked as the Contact Channel, so that story 33 is enforced and not hoped for.
41. As the Owner, I want the build to fail when the Bio or the Links Section is empty, so that a Profile with no Bio or no way to reach me can never publish.
42. As the Owner, I want the build to fail when a link is not a valid absolute URL, so that a Visitor never clicks a dead or relative link.
43. As the Owner, I want the build to fail when two Projects or two Skills share an id, so that references are never ambiguous.
44. As the Owner, I want the same validation to run in the test suite and in the site build, so that there is one set of rules, not two that drift.

### Publishing

45. As the Owner, I want the site published on GitHub Pages under this repository, so that hosting is free and needs no account I don't already have.
46. As the Owner, I want the site to live at the `profile-site` path under the repository's Pages address, so that other projects in this repository can deploy beside it later.
47. As the Owner, I want the repository's Pages root to redirect to the profile site, so that the shorter address also works when I hand it to someone.
48. As the Owner, I want a push to the main branch that touches the profile site to build and publish it automatically, so that publishing is just committing.
49. As the Owner, I want a push that doesn't touch the profile site to leave the deploy alone, so that trade-tracker commits don't rebuild my profile.
50. As the Owner, I want the deploy to run typecheck, tests and the build before publishing, so that a red test never ships.
51. As the Owner, I want a failed build to leave the previously published site untouched, so that a bad commit takes the site back to yesterday, not down.

### Privacy

52. As the Owner, I want the page to show my first name and handle and never my full legal name, so that the site is findable by people I give it to and not by search on my name.
53. As the Owner, I want no email address, phone number, birth date or city anywhere in the site or its content files, so that a public repository doesn't leak them.
54. As the Owner, I want the university and expected graduation year in the Bio prose, so that recruiters get the facts they need without a structured timeline.

### Learning the flow

55. As the Owner, I want the content rules tested at a single seam, so that I can read one test file and know what the site promises.
56. As the Owner, I want the page to contain no logic of its own, so that the later design pass can rewrite its markup without touching a test.
57. As the Owner, I want the whole project small enough to finish, so that I see the spec-to-tickets-to-code flow end to end at least once.

## Implementation Decisions

### Stack

- Astro, static output, in a new `profile-site` project folder that owns its own `package.json`, using npm. This deviates from the repository's Vite + React precedent; the reason is recorded in the project's first ADR.
- TypeScript throughout. Vitest for unit tests, ESLint for linting, matching the scripts the other projects expose (`dev`, `build`, `preview`, `test`, `test:watch`, `typecheck`, `lint`).
- No client-side JavaScript is required for v1. In-page navigation is plain anchor links to Section ids.
- English only. No internationalisation machinery.

### Content model

Content lives in a content directory inside the project, one file per Section:

- **Bio**: a Markdown file whose frontmatter carries the Tagline and whose body is the prose.
- **Now**: JSON with one Updated date (`YYYY-MM-DD`) and a list of Now Items. Each Item has a Kind (`learning`, `building`, `reading`, `other`) and one line of text.
- **Projects**: JSON list. Each Project has an id (slug), name, summary (one line), optional description (short paragraph), optional repo URL, optional live URL, Status (`active`, `paused`, `done`, `archived`), Started (`YYYY-MM`), optional Ended (`YYYY-MM`), and a list of Skill ids.
- **Skills**: JSON list. Each Skill has an id (slug), name, and Category (`language`, `framework`, `tool`, `practice`). No level, rating, or years.
- **Links**: JSON list. Each Link has a label, an absolute URL, and a boolean marking it as the Contact Channel.

Identity (first name and Handle) is carried in the Bio file's frontmatter, so the Display Name has one source.

Astro content collections define these five collections with Zod schemas. The schema objects are exported from one module and shared with the Profile loader, so the site build and the tests validate with the same definitions.

### The Profile loader

One pure module is the seam for every content rule. It takes the five Sections as already-parsed values (the objects Astro's collections hand back, or fixtures in tests) and returns either a Profile view model or a list of errors.

- Each error carries the Section (file), the item's id or index, the field, and a human sentence.
- Field-level validation (shape, enums, URL format, date format) comes from the shared Zod schemas.
- Cross-item rules live in the loader and run after field validation: Skill references resolve to declared Skills; Project and Skill ids are unique; Ended is not before Started; Status and Ended agree (Active has no Ended; Done and Archived require one; Paused may have either); exactly one Contact Channel; Bio and Links are non-empty.
- The view model is fully ordered and ready to render: Projects sorted Active first then Started descending (ties by name); Skills grouped by Category in the fixed order language, framework, tool, practice; each Project's Skills resolved to their names; the Contact Channel surfaced as its own field; and a flag per optional Section (Now, Projects, Skills) saying whether it renders.
- The loader is the only place that knows the rules. The page renders the view model and makes no decisions.

The Astro build calls the loader once at build time. If it returns errors, the build throws with all of them listed, so the Owner fixes everything in one pass.

### Page structure

- One route, the index. Sections in fixed order: Bio (Display Name, Tagline, prose), Now, Projects, Skills, Links. Each Section has a stable id for anchor navigation and a small in-page nav at the top listing the Sections that render.
- Now shows the Updated date as a plain date and the Items with their Kind.
- Projects show name, summary, Status, Started and Ended, description when present, repo and live links when present, and Skill names.
- Skills show grouped by Category with the group name as a heading.
- Links show label and URL; the Contact Channel is visually and textually marked as the way to contact the Owner.
- Page title is the Display Name; meta description is the Tagline. No Open Graph image.
- Markup is provisional and unstyled beyond a neutral baseline. The Impeccable design pass will reshape it after these tickets ship.

### Publishing

- GitHub Pages, deployed by GitHub Actions. The workflow runs on push to `master` when files under the project folder or the workflow itself change, and can also be run by hand from the Actions tab.
- Astro's `site` is the repository's Pages origin and `base` is the `profile-site` path under the repository name, so every internal URL resolves under `/Selfproj/profile-site/`.
- The deployed artifact is the built site placed under the `profile-site` path, plus a one-file redirect at the artifact root that sends `/Selfproj/` to `/Selfproj/profile-site/`.
- The workflow runs typecheck, lint, tests and build, in that order, before the deploy job. Any failure stops before publishing, leaving the previous deployment live.
- Enabling Pages with "GitHub Actions" as the source is a one-time repository setting only the Owner can change. It is its own ticket and a human step.

### Privacy

- The content files and the site contain first name and Handle, university, degree, expected graduation year, and the LinkedIn and GitHub URLs. They contain no full legal name, email, phone, birth date or city. The seed file already redacts these and is the source for the first real content.
- The Handle shown is `joramgamer`; the GitHub Link points at the `joramgamer-boop` account. This was assumed from the grilling recommendation and is a one-string change.

## Testing Decisions

A good test here states a rule the Owner would recognise from the glossary, feeds the loader a small fixture, and checks the result: either the ordered view model or the exact error (Section, item, field). Tests never reach into the loader's internals, never assert on HTML, and never depend on the real content files, so changing the Owner's content or the page's markup breaks no test.

- **Tested at the seam**: the Profile loader. One test file per rule family: schema shape, Project ordering, Skill cross-references and Category grouping, Status-and-date coherence, Contact Channel uniqueness, empty-Section rules, and error reporting (every error names Section, item and field; all errors are returned together, not just the first).
- **Integration**: the Astro build, run in CI on the real content. Passing means the real content satisfies every rule and the page renders. A deliberately broken fixture is not built in CI; that path is covered at the seam.
- **Not tested**: the page's HTML (no Container API tests), the browser (no Playwright), the deploy workflow beyond it running green once.
- **Prior art**: trade-tracker's pure modules under its core folder, each with a Vitest file beside it that builds a small state, applies one rule and asserts the outcome (rules, sizing, statistics). The loader's tests follow that shape.

## Out of Scope

- Visual design, theming, dark mode, typography, motion. All of it belongs to the Impeccable pass that follows these tickets.
- Any Section not in the fixed five: no Timeline, no Writing, no Reading list, no Certifications Section, no Photos. The CAPT certification and the 2025 SAS Hackathon are sentences in the Bio prose.
- Any interaction beyond anchor navigation: no Skill-to-Project highlighting, no status filters, no copy buttons.
- Multiple pages, per-Project pages, a CV page.
- An in-browser editor, a CMS, a backend, authentication, or any way to change content other than editing a file.
- Analytics of any kind, contact forms, mailto links.
- Social preview images, favicons beyond a default, sitemaps, RSS.
- Deriving Projects from repository folders or from the GitHub API.
- A custom domain.
- Deploying any other project in this repository to Pages (the `profile-site` subpath leaves room for it; nothing else is done).

## Further Notes

- **Order of operations after this spec**: `/to-tickets`, build the tickets, then run Impeccable (`init` first, then the design pass) against the real unstyled page. Impeccable will rewrite markup; the tickets should keep every promise in the loader and its tests so that is safe.
- **Content the Owner still has to supply** when writing the real files: the Started month for trade-tracker and tic-tac-toe, and the final Tagline wording (the LinkedIn headline is the raw material and is too long). Tickets may ship with these as clearly marked values to replace, but not with lorem ipsum anywhere else; the seed file has real prose.
- **Where Astro's content collections end and the loader begins**: collections own parsing and field-level shape via the shared schemas; the loader owns cross-item rules and ordering. If a future rule is expressible as a schema refinement it may move into the schema, but the loader remains the single place tests exercise.
- **The ADR** records why Astro over the repository precedent. Any later temptation to add a React island or swap frameworks should reread it.
- **Human steps**: enabling Pages with the Actions source, and confirming the first deploy resolves at the expected address. Both are one ticket with a checklist, not agent work.
