# 07 — Stop moves on an open Position

**What to build:** I can tighten my Stop on a live Position whenever I want, and
it's recorded. If I try to widen it, the app blocks me — and my 1R never changes
either way.

**Blocked by:** 05 — Rule engine and overrides.

**Status:** ready-for-agent

**Reference:** ADR-0001 — this ticket is the reason that ADR exists. Recomputing
1R from a moved Stop inflates every subsequent R-multiple and makes Expectancy
report an edge that isn't there.

- [x] A Stop can be moved on an open Position, recorded as a timestamped
      `StopMoved` event
- [x] Tightening (moving the Stop toward entry) is allowed without a block
- [x] Rule: widening (moving the Stop away from entry) is blocked, overridable,
      and records a Violation
- [x] **1R remains fixed at the Plan's original Stop** regardless of any number of
      moves
- [x] The current Stop and the original Stop are both visible on the open Position
- [x] Core tests confirm R-multiple on a Trade closed after a tightened Stop is
      computed against the original 1R, not the moved one
- [x] `npm run lint` and `npm test` pass
