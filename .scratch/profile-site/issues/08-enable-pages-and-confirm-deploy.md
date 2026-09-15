# 08: Enable Pages and confirm the first deploy

**What to build:** Nothing in code. This is the one repository setting only
the Owner can change, followed by checking that the published site is where
the spec says it is. Once done, every later push to `master` that touches the
profile site publishes itself.

**Blocked by:** 07 (Publish to GitHub Pages).

**Status:** ready-for-human

Spec: `.scratch/profile-site/spec.md`, "Publishing".

- [ ] In the repository's Settings, under Pages, set the source to "GitHub Actions" (not "Deploy from a branch").
- [ ] Re-run the latest workflow from the Actions tab, or push a trivial change under the profile site folder.
- [ ] Confirm the deploy job goes green.
- [ ] Open `https://joramgamer-boop.github.io/Selfproj/profile-site/` and confirm the page shows the Display Name and the Tagline, the in-page nav anchors work, and the Links open.
- [ ] Open `https://joramgamer-boop.github.io/Selfproj/` and confirm it lands on the profile site.
- [ ] Open the site on a phone and confirm it reads without horizontal scrolling. Layout beyond that is the design pass's job.
- [ ] Record the live URL in the project's README and close this ticket with a comment stating the date of the first successful deploy.
