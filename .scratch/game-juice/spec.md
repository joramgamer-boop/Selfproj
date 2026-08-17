# Spec: Tic Tac Toe — more life

Status: ready-for-agent

## Problem

The game is complete and correct but inert. Nothing about playing it rewards
you: a Mark simply appears, a win is a static tint, the computer's turn is a
fixed 450ms of dead air, and the moment a Round ends everything stops until you
find the Restart button.

Compounding it: Easy plays at random (so it hangs wins and feels stupid) and
Hard plays perfect minimax (so it cannot be beaten). There is no setting at
which a human wins a real game — and Hard is the default a first-time visitor
lands on.

## Goal

Make the act of playing feel good, without changing what wins a Round.

## Decisions (settled in a grilling session)

Rules are sacred — 3×3, three in a row, no variants, no new mechanics.
Engagement comes from feel, not from depth.

- **Zero new dependencies.** Hand-rolled CSS keyframes, inline SVG and Web
  Audio. No motion or sound libraries.
- **Phone-first**, but sharp on desktop. Haptics on where supported; hover
  affordances behind `@media (hover: hover)`.
- **Accessibility and a green test suite are hard constraints.** All motion
  respects `prefers-reduced-motion`. Sound is off by default behind a visible
  toggle. Tests get extended, not deleted.
- The indigo/pink palette stays. The card may grow if it gets cramped.

### In scope

1. Mark placement animation — a Mark lands, it doesn't just appear.
2. The Winning Line draws itself across the three Squares.
3. The computer's turn reads as thinking rather than as a frozen screen.
4. Synthesized sound for place / win / draw. Off by default, preference
   persisted.
5. Rounds auto-advance ~1.4s after ending, so the loop is play → win → playing
   again. "Restart" becomes "Reset scores", the only way back to 0–0–0 without
   leaving the Session.
6. The Starter alternates each Round.
7. A **Medium** Difficulty — minimax with an occasional deliberate blunder —
   which becomes the default.

### Explicitly out of scope

- Rule variants of any kind.
- Unlockables, XP, achievements, or any meta progression.
- Persisting the Score across reloads (only the sound preference and the
  last-used Mode/Difficulty persist).
- Animating the scoreboard when a number changes.

## Acceptance

- A first-time visitor lands on **Medium**, not Hard.
- After a Round ends, the outcome is legible and then play resumes on its own;
  no click required to keep playing.
- Over two consecutive Rounds, each player has started once.
- With `prefers-reduced-motion: reduce`, nothing animates and everything is
  still fully playable.
- Sound makes no noise until the player turns it on, and stays on across a
  reload.
- `npm run lint` and `npm test` pass.

## Issues

See `issues/`.
