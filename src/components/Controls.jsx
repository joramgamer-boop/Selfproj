export default function Controls({ onRestart, onChangeMode }) {
  return (
    <div className="controls">
      <button type="button" className="button" onClick={onRestart}>
        Restart
      </button>
      <button type="button" className="button button--secondary" onClick={onChangeMode}>
        Change Mode
      </button>
    </div>
  );
}
