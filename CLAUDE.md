## Repo layout

This repo holds several independent side projects, one per top-level folder named
after the project (kebab-case, e.g. `tic-tac-toe/`). Each project owns its own
`package.json` and toolchain — run `npm` commands from inside the project folder,
not the repo root. Only shared config lives at the root: `CLAUDE.md`, `docs/`,
`.gitignore`.

## Domain terms

Domain vocabulary is scoped to a single project, never to the repo. Terms belong
in that project's own `CONTEXT.md` (e.g. `tic-tac-toe/CONTEXT.md`) — create the
file if it doesn't exist yet, and never put terms in a `CONTEXT.md` at the root.
A term defined for one project says nothing about another; the projects here
share no domain, so don't carry a definition across folders.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary, applied as the `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

See `docs/agents/domain.md`.
