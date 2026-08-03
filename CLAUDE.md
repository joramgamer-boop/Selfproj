## Repo layout

This repo holds several independent side projects, one per top-level folder named
after the project (kebab-case, e.g. `tic-tac-toe/`). Each project owns its own
`package.json` and toolchain — run `npm` commands from inside the project folder,
not the repo root. Only shared config lives at the root: `CLAUDE.md`, `docs/`,
`.gitignore`.

Current projects:

- `tic-tac-toe/` — Vite + React Tic Tac Toe (2-player and vs-Computer with minimax).

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary, applied as the `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
