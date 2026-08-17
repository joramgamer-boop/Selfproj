# Screenshots are Evidence, never a data source

Exchange screenshots are attached to a Trade, stored and displayed, but the app
never reads them. No OCR, no vision model, no extraction of any kind. Every
logged figure is typed by hand.

## Why

The obvious feature request — and the one that prompted this decision — is
"photograph the position screen instead of typing." It cannot work, because of
what the screenshot contains. A MEXC position screen shows entry, size, Margin,
liquidation price, ROE and unrealized P&L. It does **not** show the Stop as
placed, and it cannot show the Best Price reached during the hold. Those two
fields define 1R and Capture Rate respectively — the entire measurement framework.
So extraction would faithfully capture the figures the notes call noise while
silently dropping both figures that matter.

The typing burden it would remove is also small: because sizing happens in a Plan
before entry, the only fields left at close are exit price, fees and Best Price.

## Considered and rejected

- **On-device OCR** — no network, but fragile against a dark trading UI and prone
  to a misread digit that gets rubber-stamped, and still cannot produce Stop or
  Best Price.
- **Vision-model extraction** — accurate, but requires an API key and network in
  an otherwise fully local app, and has the same fundamental gap.

## Consequences

If extraction is ever added, it must prefill fields for confirmation only, and
Stop and Best Price must remain hand-entered regardless.
