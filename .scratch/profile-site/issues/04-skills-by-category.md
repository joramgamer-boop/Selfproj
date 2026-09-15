# 04: Skills by Category

**What to build:** The page shows my Skills grouped under Language, Framework,
Tool and Practice, always in that order, with no ratings. Two Skills with the
same id fail the build naming both. An empty Skills file hides the Section.

**Blocked by:** 01 (Scaffold, the Bio, and the loader seam).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.
Seed content: `.scratch/profile-site/seed.md`.

- [ ] The Skills Section is one JSON file: a list of Skills, each with an id (slug), a display name, and a Category (`language`, `framework`, `tool`, `practice`). No level, rating or years fields exist in the schema.
- [ ] The Zod schema for a Skill lives in the shared schema module. An unknown Category, a missing name, or an id that is not a slug is a field-level error naming the Skill.
- [ ] Loader rules: Skill ids are unique (a duplicate is an error naming the id and both positions); zero Skills is valid and sets the Section's hide flag.
- [ ] The view model exposes Skills grouped by Category in the fixed order language, framework, tool, practice, omitting empty groups, with Skills inside a group in file order.
- [ ] The page renders a Skills Section with a stable id only when the flag says so: each Category as a heading with its Skills listed beneath. No design work.
- [ ] Real content from the seed's two tables: Python, SQL, JavaScript, HTML, CSS, TypeScript (language); React (framework); Git, GitHub (tool); Cybersecurity, Test-driven development (practice). Vite and Vitest are deliberately absent.
- [ ] Vitest tests at the seam: grouping order is fixed regardless of file order; empty groups are omitted; duplicate ids fail naming the id; unknown Category fails naming the Skill and the field; zero Skills sets the hide flag.
- [ ] Typecheck, lint, tests and build all pass.
