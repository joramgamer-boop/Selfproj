export default function ScoreBoard({ scores }) {
  return (
    <div className="score-board">
      <div className="score-board__item">
        <span className="score-board__label">X</span>
        <span className="score-board__value">{scores.X}</span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label">Draws</span>
        <span className="score-board__value">{scores.draws}</span>
      </div>
      <div className="score-board__item">
        <span className="score-board__label">O</span>
        <span className="score-board__value">{scores.O}</span>
      </div>
    </div>
  );
}
