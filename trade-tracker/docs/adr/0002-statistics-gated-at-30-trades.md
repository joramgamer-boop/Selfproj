# Edge statistics are hidden until 30 closed Trades

Win rate, avg win/loss R, Expectancy, Capture Rate, fee drag and the equity curve
are computed but **not rendered** until the log holds 30 closed Trades. Until
then the app shows only a progress counter and the figures the Rules themselves
need (Balance, Peak Balance, Drawdown, Trade count).

## Why

The source notes' own simulation work is unambiguous that short samples are
noise: a two-month window on a $100 account spanned $45–$167 across runs on
identical inputs. A win rate computed from seven Trades is a random number, and a
random number on screen is worse than no number — it gets steered by. The
realistic failure is abandoning a genuine edge during an ordinary losing streak,
or scaling capital up after a lucky one. Both are far more expensive than waiting.

This is also the line that keeps this project a tracker rather than the analyzer
the notes say not to build yet.

## Consequences

- A reader will see statistics code with no visible UI and may assume the feature
  is unfinished. It isn't.
- The gate is a count of closed Trades; Abandoned Plans do not count toward it.
