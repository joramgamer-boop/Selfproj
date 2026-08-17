function playerName(player, mode) {
  if (mode !== 'vsComputer') {
    return `${player}`;
  }
  return player === 'X' ? 'You' : 'Computer';
}

export default function StatusBar({ status, currentPlayer, winner, mode, computerThinking }) {
  let message;
  if (status === 'won') {
    message =
      mode === 'vsComputer'
        ? `${winner === 'X' ? 'You win' : 'Computer wins'}!`
        : `${winner} wins!`;
  } else if (status === 'draw') {
    message = "It's a draw!";
  } else if (computerThinking) {
    message = 'Computer is thinking';
  } else {
    message =
      mode === 'vsComputer' ? 'Your turn' : `${playerName(currentPlayer, mode)}'s turn`;
  }

  const showMark = status === 'playing' || status === 'won';
  const markPlayer = status === 'won' ? winner : currentPlayer;

  return (
    <p
      className={`status-bar${status !== 'playing' ? ' status-bar--settled' : ''}`}
      role="status"
      aria-live="polite"
    >
      {showMark && (
        <span
          className={`status-bar__mark${computerThinking ? ' status-bar__mark--thinking' : ''}`}
          data-player={markPlayer}
          aria-hidden="true"
        >
          {markPlayer}
        </span>
      )}
      {message}
      {/* Animated separately from the message so the live region announces a
          stable sentence rather than re-announcing on every dot. */}
      {computerThinking && (
        <span className="thinking-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
    </p>
  );
}
