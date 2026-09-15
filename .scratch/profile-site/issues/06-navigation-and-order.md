# 06: In-page navigation and the fixed order

**What to build:** The page reads top to bottom as Bio, Now, Projects, Skills,
Links, and a small nav at the top jumps to each Section. When a Section is
hidden because it's empty, its nav entry disappears too, so I never click a
link to nothing.

**Blocked by:** 02 (Links and the Contact Channel), 03 (Now), 04 (Skills by
Category), 05 (Projects).

**Status:** ready-for-agent

Vocabulary: `profile-site/CONTEXT.md`. Spec: `.scratch/profile-site/spec.md`.

- [x] The view model exposes the ordered list of Sections that render, in the fixed order Bio, Now, Projects, Skills, Links, each with its stable id and display name. Bio and Links are always present; Now, Projects and Skills appear only when their hide flag is off.
- [x] The page renders the Sections in that order and nothing else decides order.
- [x] A nav at the top of the page lists exactly the rendering Sections as plain anchor links to their ids. No client-side JavaScript; anchors only.
- [x] Verified by hand: emptying the Now file removes both the Now Section and its nav entry; restoring it brings both back.
- [x] Vitest tests at the seam: the rendering-Sections list is in fixed order regardless of input; a hidden Section is absent from the list; Bio and Links are always present.
- [x] Typecheck, lint, tests and build all pass. The page still contains no logic beyond reading the view model.
