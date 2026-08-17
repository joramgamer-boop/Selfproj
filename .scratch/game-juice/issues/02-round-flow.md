# 02 — Auto-advancing Rounds and an alternating Starter

Status: ready-for-agent

Two changes to how a Session runs, both in the reducer.

## Auto-advance

A Round currently ends by freezing until Restart is pressed — a dead stop at the
moment of peak interest. Instead, hold the finished board long enough to read
the result (~1.4s, enough for the Winning Line to finish drawing), then deal a
fresh board automatically.

The board stays locked for that whole hold, so a late click can't leak into the
next Round. The pending advance must be cancelled on unmount.

## Alternating Starter

X currently starts every Round. Once Rounds auto-advance you play many in a row,
so that becomes a standing structural advantage for X in 2 Player — and in
vs Computer it means you always open, which is the strong side.

The Starter alternates each Round within a Session. A new Session starts from X.

## Restart → Reset scores

Auto-advance does "new board, keep score" for free, so the Restart button loses
its job. It becomes **Reset scores**: back to 0–0–0 and a fresh board, without
leaving the Session.

This deliberately contradicts the current `restart` behaviour and the two tests
asserting it (`useGame.test.js`, `App.test.jsx`). Those tests are rewritten
because the intent changed — the action is renamed `resetScores` so the code
says what it means.

## Acceptance

- Two Rounds played back to back have different Starters.
- No click is needed between Rounds.
- Reset scores zeroes all three tallies and returns the Starter to X.
- Unmounting mid-hold schedules nothing.
