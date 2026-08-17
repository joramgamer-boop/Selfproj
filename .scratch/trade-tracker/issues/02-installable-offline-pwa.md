# 02 — Installable offline PWA

**What to build:** I can add the app to my phone's home screen and open it with no
network connection, and my log isn't silently deleted by the browser after a few
weeks of not trading.

**Blocked by:** 01 — Scaffold and record a Deposit.

**Status:** ready-for-agent

**Why it matters:** iOS evicts storage from ordinary Safari tabs after roughly a
week of non-use. For a sequential trader with gaps between trades, that is a
realistic way to lose the entire log. An installed PWA gets durable storage that
isn't evicted on that timer.

- [ ] Web app manifest with icons, name and standalone display mode; the app is
      installable to the home screen on mobile
- [ ] A service worker caches the app shell so it launches and functions fully
      with no network
- [ ] Persistent storage is requested, and whether it was granted is visible
      somewhere in the app
- [ ] Layout is phone-first: readable and usable one-handed, with desktop simply
      getting the same views wider
- [ ] `npm run lint` and `npm test` pass
