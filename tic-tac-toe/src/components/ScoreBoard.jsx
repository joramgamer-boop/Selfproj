export default function ScoreBoard({ scores, mode }) {
  const xLabel = mode === 'vsComputer' ? 'You (X)' : 'X';
  const oLabel = mode === 'vsComputer' ? 'Computer (O)' : 'O';

  return (
    <div className="score-board">
      <div className="score-board__item">
        <span className="score-board__label" data-player="X">
          {xLabel}
        </span>
        <span className="score-board__value">{scores.X}</span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label">Draws</span>
        <span className="score-board__value">{scores.draws}</span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label" data-player="O">
          {oLabel}
        </span>
        <span className="score-board__value">{scores.O}</span>
      </div>
    </div>
  );
}
