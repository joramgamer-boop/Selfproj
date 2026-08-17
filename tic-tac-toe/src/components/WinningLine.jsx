// Cell centres in the SVG's own 100x100 space. The board is a uniform square
// grid, so a centre is just its row/column index mapped onto thirds; the 8px
// gap shifts them by well under a pixel at any realistic board size.
const CELL_SPAN = 100 / 3;

function centre(index) {
  return {
    x: (index % 3) * CELL_SPAN + CELL_SPAN / 2,
    y: Math.floor(index / 3) * CELL_SPAN + CELL_SPAN / 2,
  };
}

// Stopping dead at the centre of the end squares looks clipped, so the stroke
// runs on a little past both ends.
const OVERSHOOT = 9;

/**
 * The stroke that draws itself across a won line. Purely decorative — the
 * outcome is already announced in the status bar and marked on the squares
 * themselves, so this is hidden from assistive tech and never takes pointer
 * events.
 */
export default function WinningLine({ line, winner }) {
  if (!line) {
    return null;
  }

  const from = centre(line[0]);
  const to = centre(line[line.length - 1]);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const unit = { x: dx / length, y: dy / length };

  return (
    <svg
      className="winning-line"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <line
        className="winning-line__stroke"
        x1={from.x - unit.x * OVERSHOOT}
        y1={from.y - unit.y * OVERSHOOT}
        x2={to.x + unit.x * OVERSHOOT}
        y2={to.y + unit.y * OVERSHOOT}
        // Normalising the geometric length to 1 lets the dash animation be
        // written once instead of per line direction — a diagonal is 1.41x a
        // row and would otherwise draw at a different speed.
        pathLength="1"
        data-player={winner}
      />
    </svg>
  );
}
