# 01 — Medium difficulty

Status: ready-for-agent

Add a third Difficulty between the random Easy and the perfect Hard: minimax,
but with an occasional deliberate blunder. This is the only setting at which a
human can win against a computer that is genuinely trying.

Not a rules change — it tunes which move function the existing computer turn
already calls.

## Work

- `getMediumMove(squares, aiPlayer, random)` in `gameLogic.js`. Takes an
  injectable `random` so its distribution is testable without stubbing globals.
- Blunder chance ~25%. A blunder is a legal random move, never an illegal one.
- Add Medium to the Difficulty options and make it the **default** selection.
- Easy stays pure random — it is the honest floor for a beginner.

## Acceptance

- With a `random` that never blunders, Medium plays the same move as Hard.
- With a `random` that always blunders, Medium still returns an empty Square.
- The Difficulty hints describe skill, not interface speed.
