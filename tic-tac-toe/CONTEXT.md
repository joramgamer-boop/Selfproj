# Context

Glossary for this project. Terms here are the canonical vocabulary — code, issues,
tests and commit messages should use these words and avoid the listed synonyms.

## Mark

A single `X` or `O` belonging to one player. The thing a player places.

Not "piece", not "token", not "symbol".

## Square

One of the nine cells of the board. A square is either empty or holds a Mark.

## Board

The 3×3 arrangement of Squares for a single Round.

## Round

One board played from empty to an outcome. A Round ends in exactly one of two
ways: a **win** (some player completed a Winning Line) or a **draw** (every
Square filled with no Winning Line). A Round always has a Starter.

Note: "game" is ambiguous between Round and Session and is avoided as a domain
term — the words below are used instead.

## Session

A consecutive run of Rounds played under one Mode and Difficulty. A Session owns
the Score; the Score is meaningless outside one. Changing Mode or Difficulty
ends the Session and begins a new one, which is why it begins from zero.

A Session has no fixed length — it is not "best of N", and it has no winner of
its own. Only Rounds have winners.

## Starter

The player who moves first in a Round. The Starter alternates from Round to
Round within a Session, so no player holds the first-move advantage throughout.

## Winning Line

The three collinear Squares — a row, a column, or a diagonal — that ended a
Round in a win. A Round has at most one Winning Line.

## Score

The running tally over a Session: wins for X, wins for O, and draws. Draws are
counted, not discarded. The Score is banked at the moment a Round ends and is
never recalculated from history.

## Mode

How the two seats are filled: **2 Player** (both human, same device) or
**vs Computer** (the human is always X).

## Difficulty

How well the computer plays. Applies only in the vs Computer Mode.

- **Easy** — plays at random.
- **Medium** — plays well, but blunders occasionally. The only Difficulty at
  which a human can win against a computer that is genuinely trying.
- **Hard** — plays perfectly. Cannot be beaten; the best available outcome is a
  draw.

Difficulty describes the computer's *skill*, never the speed of the interface or
the length of a Round.
