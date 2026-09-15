---
status: accepted
date: 2026-09-14
---

# Astro over the repo's Vite + React precedent

The other projects in this repo (tic-tac-toe, trade-tracker) are Vite + React 19
+ TypeScript + Vitest, so a reader will expect profile-site to match. It
doesn't: profile-site is built with Astro. The site is a single static page whose
content is files in the repo (JSON per Section, Markdown for the Bio), validated
at build time and failing the build when invalid. Astro's content collections do
exactly that out of the box, where the Vite + React path would mean writing the
loader and validator by hand. The Owner also wants to learn Astro, and this
project is small enough to be the place to do it.

## Considered options

- Vite + React + TypeScript, matching the precedent. Rejected: familiar, but the
  content pipeline would be hand-rolled and the React runtime buys nothing on a
  page with no interactivity beyond anchor links.
- Plain HTML with a stamping script. Rejected: no schema, no build-time
  validation, nothing to test.

## Consequences

- Vitest is still used, but only for the content schema and the pure logic
  (Project ordering, Skill cross-references, the single Contact Channel). The
  Astro build is the integration test.
- A future React-flavoured feature does not justify swapping frameworks; Astro
  can host a React island if one is ever needed.
