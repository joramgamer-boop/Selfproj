import { useState } from 'react';
import './App.css';
import ModeSelect from './components/ModeSelect';
import Game from './components/Game';

const INITIAL_SCORES = { X: 0, O: 0, draws: 0 };

export default function App() {
  const [view, setView] = useState('select');
  const [mode, setMode] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [scores, setScores] = useState(INITIAL_SCORES);

  function handleStart(selectedMode, selectedDifficulty) {
    setMode(selectedMode);
    setDifficulty(selectedDifficulty);
    setScores(INITIAL_SCORES);
    setView('game');
  }

  function handleRoundEnd(winner) {
    setScores((prev) => ({
      X: winner === 'X' ? prev.X + 1 : prev.X,
      O: winner === 'O' ? prev.O + 1 : prev.O,
      draws: winner === null ? prev.draws + 1 : prev.draws,
    }));
  }

  function handleChangeMode() {
    setView('select');
    setMode(null);
    setDifficulty(null);
    setScores(INITIAL_SCORES);
  }

  return (
    <div className="app">
      <div className="card">
        {view === 'select' ? (
          <ModeSelect onStart={handleStart} />
        ) : (
          <Game
            mode={mode}
            difficulty={difficulty}
            scores={scores}
            onRoundEnd={handleRoundEnd}
            onChangeMode={handleChangeMode}
          />
        )}
      </div>
    </div>
  );
}
