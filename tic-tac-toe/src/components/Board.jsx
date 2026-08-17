import Square from './Square';
import WinningLine from './WinningLine';

export default function Board({
  squares,
  winningLine,
  winner,
  nextPlayer,
  onSquareClick,
  disabled,
}) {
  return (
    <div className="board" role="grid" aria-label="Tic Tac Toe board">
      {squares.map((value, index) => (
        <Square
          key={index}
          index={index}
          value={value}
          onClick={() => onSquareClick(index)}
          isWinning={Boolean(winningLine && winningLine.includes(index))}
          disabled={disabled}
          nextPlayer={nextPlayer}
        />
      ))}
      <WinningLine line={winningLine} winner={winner} />
    </div>
  );
}
