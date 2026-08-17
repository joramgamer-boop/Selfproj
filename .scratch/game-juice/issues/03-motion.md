# 03 — Motion: placement, Winning Line, thinking

Status: ready-for-agent

Hand-rolled CSS keyframes and inline SVG. No motion library.

## Mark placement

A Mark should land rather than appear — overshoot slightly and settle. The
existing `mark-in` keyframe is the starting point but is too timid to read.

## Winning Line

Replace the flat `square--winning` fill with a stroke that draws itself across
the three Squares, in the winner's colour, over ~450ms.

Inline SVG overlaid on the grid, `pathLength="1"` so the dash animation is
resolution-independent. Winning Squares keep a soft player-tinted background so
the line stays legible on top of them — the current solid-accent fill would hide
it.

The overlay is decorative: `aria-hidden`, and never intercepts pointer events.

## Thinking

The computer's turn is currently a static string for a fixed 450ms. Give it an
animated pulse, and vary the delay by Difficulty so the pause reads as effort
rather than as a hang.

## Hover ghost

A faded Mark under the cursor on empty Squares, behind `@media (hover: hover)`
so it never fires on touch.

## Constraint

Everything above sits behind `prefers-reduced-motion`. With motion reduced the
game must be fully playable and the outcome of a Round must still be obvious —
which means the Winning Line renders, it just doesn't animate in.
