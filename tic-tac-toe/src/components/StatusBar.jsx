export default function StatusBar({ currentPlayer, winner, isDraw }) {
  let message;
  if (winner) {
    message = `${winner} wins!`;
  } else if (isDraw) {
    message = "It's a draw!";
  } else {
    message = `${currentPlayer}'s turn`;
  }

  return <p className="status-bar">{message}</p>;
}
