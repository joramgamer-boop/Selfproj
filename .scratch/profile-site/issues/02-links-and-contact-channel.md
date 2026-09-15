# 02: Links and the Contact Channel

**What to build:** The page shows my Links (GitHub and LinkedIn), and LinkedIn
is marked as the one way to contact me. If I mark two Links as the Contact
Channel, or none, or write a bad URL, or leave the Links file empty, the build
fails and tells me which Link and which field.

**Blocked by:** 01 (Scaffold, the Bio, and the loader seam).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.
Seed content: `.scratch/profile-site/seed.md`.

- [ ] The Links Section is one JSON file: a list of Links, each with a label, an absolute URL, and a boolean marking it as the Contact Channel.
- [ ] The Zod schema for a Link lives in the shared schema module and is used by both the content collection and the loader. A URL that is not absolute (no scheme or host) is a field-level error.
- [ ] Loader rules: the Links Section is non-empty; exactly one Link is the Contact Channel (zero or more than one is an error naming the Section and the field, listing the offending Links by label).
- [ ] The view model exposes the ordered Links as written in the file and the Contact Channel as its own field.
- [ ] The page renders a Links Section with a stable id: each Link as its label linking to its URL, and the Contact Channel textually marked as the way to contact the Owner (for example a "contact me here" marker next to it). No design work.
- [ ] Real content: GitHub at `https://github.com/joramgamer-boop` and LinkedIn at `https://www.linkedin.com/in/joram-delas-alas-b3b2b5418`, LinkedIn as the Contact Channel. No mailto, no email anywhere.
- [ ] Vitest tests at the seam: empty Links fails; zero Contact Channels fails; two fail with both labels named; one passes; a relative URL fails naming the Link and the field; a valid file yields the Contact Channel field.
- [ ] Typecheck, lint, tests and build all pass.
