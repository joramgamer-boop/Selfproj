import Square from './Square';

export default function Board({ squares, winningLine, onSquareClick, disabled }) {
  return (
    <div className="board">
      {squares.map((value, index) => (
        <Square
          key={index}
          value={value}
          onClick={() => onSquareClick(index)}
          isWinning={Boolean(winningLine && winningLine.includes(index))}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
