# 04 — Sound and haptics

Status: ready-for-agent

## Sound

Short synthesized blips via Web Audio — no audio files, no library. Three cues:
placing a Mark (pitched differently per player), winning a Round, drawing a
Round.

- **Off by default.** Never make noise the player didn't ask for.
- A visible toggle in the game controls, labelled for screen readers with its
  current state.
- The preference persists in `localStorage`; the last-used Mode and Difficulty
  persist alongside it. The Score does not — returning days later to a stale
  7–3 is worse than starting fresh, and persisting it drifts into the meta
  progression that was ruled out.
- The `AudioContext` is created lazily on the first sound, i.e. always after a
  user gesture, and must degrade to a no-op where it doesn't exist (jsdom under
  test, older browsers). Sound failing must never break a move.

## Haptics

`navigator.vibrate` on place and on win, guarded for absence. Short and subtle —
a long buzz on a tic-tac-toe move is obnoxious.

Haptics follow the same toggle as sound: one "feedback" switch, not two.

## Acceptance

- A fresh visitor plays a full Round in silence.
- Toggling on, reloading, and playing again produces sound.
- Tests pass in jsdom, where `AudioContext` and `vibrate` are both absent.
