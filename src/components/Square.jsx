export default function Square({ value, onClick, isWinning, disabled }) {
  const className = `square${isWinning ? ' square--winning' : ''}`;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || value !== null}
    >
      {value}
    </button>
  );
}
