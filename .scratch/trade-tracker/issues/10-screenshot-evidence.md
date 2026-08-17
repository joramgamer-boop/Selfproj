# 10 — Screenshot Evidence

**What to build:** When I close a Position I attach a screenshot of the exchange's
closed-position screen. I can open it later from the Trade as proof of the fill.

**Blocked by:** 04 — Position lifecycle.

**Status:** ready-for-agent

**Reference:** ADR-0003 — Evidence is stored and displayed but **never read**. The
screenshot does not contain the Stop or the Best Price, so it cannot be a source
of logged data.

- [ ] A screenshot can be attached when closing a Position, and to an existing
      Trade afterwards
- [ ] The image is stored as a blob through the storage port and survives reload
- [ ] The image is viewable full-size from the Trade detail view and can be
      replaced or removed
- [ ] Attaching Evidence is optional — a missing screenshot never blocks closing a
      Position
- [ ] **No parsing, OCR, or extraction of any kind** — no field is ever populated
      from the image
- [ ] The storage-port contract test covers round-tripping a Trade with an
      attached blob through both implementations
- [ ] `npm run lint` and `npm test` pass
