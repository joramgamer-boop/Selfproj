# 03: Now

**What to build:** The page shows what I'm doing now: a short list of Items,
each with a Kind, and the date I last Updated it. When I empty the list, the
whole Now Section disappears from the page instead of showing an empty
heading. A bad Kind or a malformed date fails the build naming the Item and
the field.

**Blocked by:** 01 (Scaffold, the Bio, and the loader seam).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.
Seed content: `.scratch/profile-site/seed.md`.

- [ ] The Now Section is one JSON file: one Updated date in `YYYY-MM-DD` form, set by hand, and a list of Now Items. Each Item has a Kind (`learning`, `building`, `reading`, `other`) and one line of text.
- [ ] The Zod schema for Now lives in the shared schema module. An unknown Kind, empty text, or a date not in `YYYY-MM-DD` form is a field-level error naming the Item's index and the field.
- [ ] Loader rule: Now with zero Items is valid and yields a view-model flag saying the Section does not render. Updated is still required even when the list is empty.
- [ ] The view model exposes the Items in file order, their Kind, and the Updated date.
- [ ] The page renders a Now Section with a stable id only when the flag says so: the Updated date shown plainly as a date, then the Items with their Kind. No staleness warning, no hiding by age. No design work.
- [ ] Real content from the seed: learning Python and SQL; learning the spec-and-tickets flow; building profile-site; building trade-tracker. Updated set to the day the file is written.
- [ ] Vitest tests at the seam: valid Now yields ordered Items and the date; empty Items sets the hide flag and is not an error; unknown Kind, empty text and a malformed date each fail naming the Item and the field; a missing Updated fails even with zero Items.
- [ ] Typecheck, lint, tests and build all pass.
