const POSITION_NAMES = [
  'top left',
  'top centre',
  'top right',
  'middle left',
  'centre',
  'middle right',
  'bottom left',
  'bottom centre',
  'bottom right',
];

export default function Square({ index, value, onClick, isWinning, disabled, nextPlayer }) {
  const label = value ? `${POSITION_NAMES[index]}, ${value}` : `${POSITION_NAMES[index]}, empty`;

  return (
    <button
      type="button"
      className={`square${isWinning ? ' square--winning' : ''}`}
      onClick={onClick}
      disabled={disabled || value !== null}
      data-player={value ?? undefined}
      // Drives the hover preview. Only meaningful on an empty, playable square,
      // and the CSS that uses it is gated on a real hover-capable pointer.
      data-next={value === null ? nextPlayer : undefined}
      aria-label={label}
    >
      {value && <span className="square__mark">{value}</span>}
    </button>
  );
}
