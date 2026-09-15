# 05: Projects

**What to build:** The page lists my Projects, Active ones first and the rest
by most recent Started, each with its summary, Status, dates, repository link
and the Skills it used. A Project that names a Skill I never declared, or whose
dates and Status disagree, or whose Ended is before its Started, fails the
build naming the Project and the field.

**Blocked by:** 04 (Skills by Category).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.
Seed content: `.scratch/profile-site/seed.md`.

- [x] The Projects Section is one JSON file: a list of Projects, each with an id (slug), name, summary (one line), optional description (short paragraph), optional repo URL, optional live URL, Status (`active`, `paused`, `done`, `archived`), Started (`YYYY-MM`), optional Ended (`YYYY-MM`), and a list of Skill ids.
- [x] The Zod schema for a Project lives in the shared schema module. Unknown Status, a month not in `YYYY-MM` form, a URL that is not absolute, or an id that is not a slug is a field-level error naming the Project and the field.
- [x] Loader rules, each an error naming the Project and the field: Project ids are unique; every Skill id resolves to a declared Skill; Ended is not before Started; Status and Ended agree (Active has no Ended; Done and Archived require an Ended; Paused may have either). Zero Projects is valid and sets the Section's hide flag.
- [x] The view model exposes Projects ordered Active first, then by Started descending, ties broken by name; each Project's Skill ids resolved to Skill names. The Projects list is exactly what the file says and is never derived from repository folders.
- [x] The page renders a Projects Section with a stable id only when the flag says so: name, summary, Status, Started and Ended (when present), description when present, repo and live links when present, and Skill names. No design work.
- [x] Real content from the seed: `trade-tracker` (Active, Skills TypeScript, React, Test-driven development, repo link to its folder on GitHub) and `tic-tac-toe` (Done, same Skills, repo link). Started and Ended months are set to the best guess from git history and clearly marked in the file as values the Owner will finalise. No other Projects.
- [x] Vitest tests at the seam: ordering (Active first, then Started descending, tie by name); unknown Skill id fails naming the Project and the Skill; duplicate Project ids fail; Ended before Started fails; Active with Ended fails; Done without Ended fails; Paused with and without Ended both pass; Skill names are resolved in the view model; zero Projects sets the hide flag.
- [x] Typecheck, lint, tests and build all pass.

## Comments

- 2026-09-15: Shipped. `profile-site/src/content/projects.json` carries an `_ownerTodo` note on each Project naming what the Owner still finalises: trade-tracker's Started (git says 2026-08), and tic-tac-toe's Started, Ended (both 2026-08 from git) and summary wording. The schema strips the note, so deleting it is the only cleanup. The in-page nav is issue 06.
