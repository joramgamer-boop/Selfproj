# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`<project>/CONTEXT.md`** — the glossary for the project you're working in, e.g. `tic-tac-toe/CONTEXT.md`. Glossaries are per project: there is no repo-wide one, and a term defined for one project says nothing about another, so read only the file for the project you're in. The `CONTEXT.md` at the root is a stub pointing here.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. Also check `<project>/docs/adr/` for project-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

One glossary per project folder, none at the root:

```
/
├── CLAUDE.md
├── CONTEXT.md                         ← stub; points at the per-project files
├── docs/adr/                          ← repo-wide decisions
└── <project>/
    ├── CONTEXT.md                     ← this project's glossary
    └── docs/adr/                      ← project-scoped decisions
```

A project has a `CONTEXT.md` only once its terms are actually settled, so expect
some projects not to have one yet.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in that project's `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
