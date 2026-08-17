import { useState } from 'react';

const MODES = [
  { value: '2p', label: '2 Player', hint: 'Take turns on the same device.' },
  { value: 'vsComputer', label: 'vs Computer', hint: 'Play X against the machine.' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', hint: 'The computer plays at random.' },
  { value: 'medium', label: 'Medium', hint: 'Plays well, but slips up. You can win this one.' },
  { value: 'hard', label: 'Hard', hint: 'Perfect play — the best you can do is draw.' },
];

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="option-group">
      <span className="option-group__label">{label}</span>
      <div className="option-group__buttons" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`button ${value === option.value ? 'button--active' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ModeSelect({ onStart, initialMode = '2p', initialDifficulty = 'medium' }) {
  const [mode, setMode] = useState(initialMode);
  const [difficulty, setDifficulty] = useState(initialDifficulty);

  const hint =
    mode === 'vsComputer'
      ? DIFFICULTIES.find((option) => option.value === difficulty).hint
      : MODES.find((option) => option.value === mode).hint;

  function handleStart() {
    onStart(mode, mode === 'vsComputer' ? difficulty : null);
  }

  return (
    <div className="mode-select">
      <header className="mode-select__header">
        <h1 className="mode-select__title">
          Tic <span data-player="X">Tac</span> Toe
        </h1>
        <p className="mode-select__subtitle">Three in a row wins the round.</p>
      </header>

      <OptionGroup label="Mode" options={MODES} value={mode} onChange={setMode} />

      {mode === 'vsComputer' && (
        <OptionGroup
          label="Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={setDifficulty}
        />
      )}

      <p className="mode-select__hint">{hint}</p>

      <button type="button" className="button button--primary" onClick={handleStart}>
        Start Game
      </button>
    </div>
  );
}
