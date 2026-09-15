# profile-site

A one-page profile site, built with Astro from the content files under
`src/content/`. Vocabulary is in `CONTEXT.md`; the reason for Astro is in
`docs/adr/`.

## Publishing

The GitHub Actions workflow at `.github/workflows/publish-profile-site.yml`
publishes this site to GitHub Pages. It runs on every push to `master` that
changes a file under `profile-site/` or the workflow file itself, and it can
also be started by hand from the repository's Actions tab. Its build job
runs, from inside this folder, `npm ci`, then the typecheck, lint, tests and
build in that order; any failure stops the run before the deploy job, so the
previously published site stays live. The deploy job uploads the built site
under a `profile-site/` directory, with a one-file redirect page (from
`pages-root/index.html`) at the root, and publishes it with GitHub's Pages
deploy action, so the site ends up at
`https://joramgamer-boop.github.io/Selfproj/profile-site/` and
`https://joramgamer-boop.github.io/Selfproj/` redirects there. Astro's `site`
and `base` in `astro.config.mjs` match those addresses, which is why
`npm run preview` serves the site at `/Selfproj/profile-site/` rather than at
`/`. Nothing in the workflow needs a secret.
