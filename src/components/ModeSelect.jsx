import { useState } from 'react';

export default function ModeSelect({ onStart }) {
  const [mode, setMode] = useState('2p');
  const [difficulty, setDifficulty] = useState('hard');

  function handleStart() {
    onStart(mode, mode === 'vsComputer' ? difficulty : null);
  }

  return (
    <div className="mode-select">
      <h1>Tic Tac Toe</h1>

      <div className="mode-select__group">
        <button
          type="button"
          className={`button ${mode === '2p' ? 'button--active' : ''}`}
          onClick={() => setMode('2p')}
        >
          2 Player
        </button>
        <button
          type="button"
          className={`button ${mode === 'vsComputer' ? 'button--active' : ''}`}
          onClick={() => setMode('vsComputer')}
        >
          vs Computer
        </button>
      </div>

      {mode === 'vsComputer' && (
        <div className="mode-select__group">
          <button
            type="button"
            className={`button ${difficulty === 'easy' ? 'button--active' : ''}`}
            onClick={() => setDifficulty('easy')}
          >
            Easy
          </button>
          <button
            type="button"
            className={`button ${difficulty === 'hard' ? 'button--active' : ''}`}
            onClick={() => setDifficulty('hard')}
          >
            Hard
          </button>
        </div>
      )}

      <button type="button" className="button button--primary" onClick={handleStart}>
        Start Game
      </button>
    </div>
  );
}
