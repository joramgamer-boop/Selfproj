# 07: Publish to GitHub Pages

**What to build:** I push a change to the profile site on `master` and a
workflow builds and publishes it to GitHub Pages under
`/Selfproj/profile-site/`, with `/Selfproj/` redirecting there. A push that
doesn't touch the profile site doesn't run it. A failing typecheck, lint,
test or build stops before deploying, so the previous site stays live.

This can ship as soon as ticket 01 exists: publishing a Bio-only page early is
the point.

**Blocked by:** 01 (Scaffold, the Bio, and the loader seam).

**Status:** ready-for-agent

Spec: `.scratch/profile-site/spec.md`, "Publishing".

- [x] A GitHub Actions workflow at the repository root runs on push to `master` when files under the profile site folder or the workflow file itself change, and can also be started by hand from the Actions tab.
- [x] The workflow's build job runs, from inside the project folder and in this order: install, typecheck, lint, test, build. Any failure fails the job and the deploy job does not run.
- [x] Astro's `site` is the repository's Pages origin (`https://joramgamer-boop.github.io`) and `base` is `/Selfproj/profile-site`, so every internal URL and asset resolves under that path. Verified by hand with `npm run preview` that anchors and assets work under the base.
- [x] The uploaded Pages artifact contains the built site under a `profile-site/` directory plus a one-file redirect at the artifact root that sends `/Selfproj/` to `/Selfproj/profile-site/` (a meta refresh page with a fallback link is sufficient).
- [x] The deploy job uses GitHub's official Pages deploy action with the minimal permissions it needs, and nothing in the workflow requires a secret.
- [x] The workflow file is documented in one paragraph in the project's README (create it if absent): what triggers it, what it runs, where the site ends up.
- [ ] The workflow parses and the build job runs green on push. The deploy job is expected to fail or be skipped until ticket 08 enables Pages; that is acceptable for this ticket and is called out in the ticket's Comments when it happens.

## Comments

- 2026-09-15: Committed on `master`, not pushed. The workflow is `.github/workflows/publish-profile-site.yml`; the redirect page is `profile-site/pages-root/index.html`; `site` and `base` are set in `profile-site/astro.config.mjs`; the README's "Publishing" paragraph describes the workflow. Verified locally: the workflow parses; typecheck, lint, 88 tests and build pass from inside `profile-site/`; `npm run preview` serves the page at `/Selfproj/profile-site/` (200) and 404s at `/`, with the five Section anchors intact (the page has no assets yet, so `base` is not exercised beyond the path); the artifact assembly commands produce `index.html` + `profile-site/index.html`. The last checkbox waits on the Owner pushing `master`; the deploy job is expected to fail until ticket 08 enables Pages with "GitHub Actions" as the source.
