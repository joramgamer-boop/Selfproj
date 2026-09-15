# 01: Scaffold, the Bio, and the loader seam

**What to build:** I run the dev server and see a page with my Display Name,
my Tagline and my Bio prose, with the browser tab showing my Display Name. I
break the Bio file (delete the Tagline) and the build fails with a message that
names the Bio, the field and what's wrong.

This is the tracer bullet: the thinnest complete path through every layer the
other tickets build on. It establishes the Astro project, the content
collection pattern with shared Zod schemas, the Profile loader as the single
seam for content rules, the loader's error shape, the page that renders a view
model and decides nothing, and the test style. Only the Bio Section exists so
far.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.
Seed content: `.scratch/profile-site/seed.md`. Respect the ADR at
`profile-site/docs/adr/0001-astro-over-vite-react.md`.

- [x] A new `profile-site` project folder owns its own `package.json` (npm) with the repo's standard scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `typecheck`, `lint`. `build` runs typecheck first, as trade-tracker does.
- [x] Astro is configured for static output with TypeScript; Vitest is wired through Astro's Vite config; ESLint runs clean on the scaffold.
- [x] Astro's generated cache folder is ignored in the repo's root `.gitignore`; the existing `node_modules/` and `dist/` rules already cover the rest.
- [x] The Bio is one Markdown file in the project's content directory. Frontmatter carries first name, Handle and Tagline; the body is the prose. The Display Name is derived as first name plus Handle, from this one source.
- [x] Zod schemas live in one module, exported for both Astro's content collection definitions and the Profile loader, so the build and the tests validate with the same definitions.
- [x] The Profile loader is a pure module: it takes already-parsed Section values and returns either a Profile view model or a list of errors. Every error carries the Section, the item (id or index, or none for a single-file Section), the field, and a human sentence. All errors are returned together, never only the first.
- [x] Loader rules in this ticket: Bio is present and non-empty; Tagline is present and non-empty; first name and Handle are present.
- [x] The Astro build calls the loader once; if it returns errors the build throws listing all of them. Verified by hand: removing the Tagline fails `npm run build` with a message naming the Bio and the field.
- [x] The index page renders Display Name, Tagline and the prose body, in a Bio Section with a stable id. The page title is the Display Name and the meta description is the Tagline. Markup is a neutral unstyled baseline; no design work.
- [x] The page contains no logic: it reads the view model and renders it.
- [x] Real content: the Bio prose is adapted from the seed file's summary, with the university, degree and expected graduation (2028) in the prose, and the CAPT certification and the 2025 SAS Hackathon as sentences. First name `Joram`, Handle `joramgamer`. The Tagline is a short placeholder clearly marked in the file as a value the Owner will finalise. No full name, email, phone, birth date or city anywhere.
- [x] Vitest tests at the seam, in the style of trade-tracker's core tests: small fixtures in, view model or exact errors out. Cover the Bio rules and the error shape (Section, item, field, all errors together). No tests assert on HTML.
- [x] `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` all pass from inside `profile-site/`.
