import { useState } from 'react';
import './App.css';
import ModeSelect from './components/ModeSelect';
import Game from './components/Game';
import { loadPreferences, savePreferences } from './preferences';

export default function App() {
  const [session, setSession] = useState(null);
  // Read once on mount: the menu only needs a starting point, and re-reading
  // would fight the user's in-session edits.
  const [preferences] = useState(loadPreferences);

  function handleStart(mode, difficulty) {
    savePreferences({ mode, difficulty: difficulty ?? preferences.difficulty });
    setSession({ mode, difficulty });
  }

  function handleChangeMode() {
    setSession(null);
  }

  return (
    <div className="app">
      <main className="card">
        {session === null ? (
          <ModeSelect
            onStart={handleStart}
            initialMode={preferences.mode}
            initialDifficulty={preferences.difficulty}
          />
        ) : (
          // Keyed on the chosen setup so picking a new mode starts a clean
          // session: fresh board and fresh scores.
          <Game
            key={`${session.mode}-${session.difficulty}`}
            mode={session.mode}
            difficulty={session.difficulty}
            onChangeMode={handleChangeMode}
          />
        )}
      </main>
    </div>
  );
}
