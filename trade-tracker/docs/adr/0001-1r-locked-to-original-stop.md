# 1R is locked to the Plan's original Stop

A Stop may be tightened while a Position is open (trailing to breakeven is normal
practice), and the obvious implementation recomputes 1R whenever the Stop moves.
We deliberately do not: **1R is fixed at the Plan's original Stop and never
recalculated**, so a stop move is recorded as a timestamped event that leaves the
Trade's risk denominator untouched.

## Why

1R is the risk you actually took when you entered. Recomputing it against a
tightened Stop inflates every subsequent number: a trade stopped out at breakeven
reads as 0R instead of the free option it was, and a winner measured against a
Stop moved to breakeven produces an enormous R-multiple against a risk that no
longer existed. Expectancy would drift upward over time for no reason other than
good stop management, and the log would report an edge that isn't there — the
exact failure this project exists to detect.

## Consequences

- Reversing this invalidates every R-multiple ever recorded. Treat it as
  permanent.
- Widening a Stop genuinely increases risk beyond what was committed, so it is a
  blocked Rule with a Violation flag rather than a recalculation. The Rule judges
  the move against where the Stop stands at the time, not only against the
  original: giving back risk already taken off the table is the same reflex, and
  a Stop that may be walked back as far as the original in stages is not a Stop
  that only tightens.
- A Trade closed at a moved Stop may show an R-multiple that looks inconsistent
  with its exit price. That is correct and intended.
