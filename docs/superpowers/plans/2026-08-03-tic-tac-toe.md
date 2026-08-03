# Tic Tac Toe Practice Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React Tic Tac Toe website with 2-player and vs-Computer (Easy/Hard) modes, score tracking, and win-line highlighting, per `docs/superpowers/specs/2026-08-03-tic-tac-toe-design.md`.

**Architecture:** Single-page React app with two views (Mode Select, Game) switched via local state in `App`. Game logic (`calculateWinner`, `isDraw`, `getRandomMove`, `getBestMove`) lives in a pure, dependency-free module unit-tested with Vitest. UI is a small component tree (`ModeSelect`, `Game`, `Board`, `Square`, `StatusBar`, `ScoreBoard`, `Controls`) styled with plain CSS.

**Tech Stack:** Vite, React 18 (JavaScript, no TypeScript), Vitest, plain CSS. No backend, no router, no CSS framework.

## Global Constraints

- JavaScript only, no TypeScript.
- Plain CSS only, no CSS framework/library.
- No backend, no accounts, no persistence beyond the current browser session.
- No UI test framework/component tests — only `src/gameLogic.js` gets automated (Vitest) tests. UI is verified manually by running the dev server.
- No routing library — views are switched via local React state.
- In vs-Computer mode, the human always plays `'X'` and moves first; the computer always plays `'O'`. Empty cells are represented as `null`.
- Score tracking (`{ X, O, draws }`) persists across "Restart" but resets on "Change Mode".

---

### Task 1: Project scaffold (Vite + React)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`
- Create: `src/App.jsx` (placeholder, replaced in Task 8)

**Interfaces:**
- Produces: an `npm run dev` / `npm run build` / `npm test` toolchain that every later task builds on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tic-tac-toe",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tic Tac Toe</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Create `src/index.css`**

```css
:root {
  --color-bg: #f4f5f7;
  --color-card: #ffffff;
  --color-text: #1f2430;
  --color-muted: #6b7280;
  --color-accent: #4f46e5;
  --color-accent-soft: #e0e7ff;
  --color-border: #e2e4e9;
  --radius: 12px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.app {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 24px;
}

.card {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  padding: 32px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
```

- [ ] **Step 6: Create placeholder `src/App.jsx`**

```jsx
export default function App() {
  return (
    <div className="app">
      <div className="card">Tic Tac Toe</div>
    </div>
  );
}
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: completes without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 8: Verify the scaffold builds**

Run: `npm run build`
Expected: `vite build` completes successfully and creates a `dist/` directory.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.jsx src/index.css src/App.jsx
git commit -m "chore: scaffold Vite + React project"
```

---

### Task 2: Game logic — `calculateWinner` and `isDraw`

**Files:**
- Create: `src/gameLogic.js`
- Test: `src/gameLogic.test.js`

**Interfaces:**
- Produces: `calculateWinner(squares: Array<'X'|'O'|null>) -> { winner: 'X'|'O', line: number[] } | null`
- Produces: `isDraw(squares: Array<'X'|'O'|null>) -> boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/gameLogic.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { calculateWinner, isDraw } from './gameLogic';

describe('calculateWinner', () => {
  it('detects each of the 8 winning lines', () => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const line of lines) {
      const squares = Array(9).fill(null);
      line.forEach((index) => {
        squares[index] = 'X';
      });
      const result = calculateWinner(squares);
      expect(result.winner).toBe('X');
      expect(result.line).toEqual(line);
    }
  });

  it('returns null for a board with no winner', () => {
    const squares = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(calculateWinner(squares)).toBeNull();
  });

  it('returns null for an empty board', () => {
    expect(calculateWinner(Array(9).fill(null))).toBeNull();
  });
});

describe('isDraw', () => {
  it('is true when the board is full and there is no winner', () => {
    const squares = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(isDraw(squares)).toBe(true);
  });

  it('is false when the board is full but there is a winner', () => {
    const squares = ['X', 'X', 'X', 'O', 'O', 'X', 'X', 'O', 'O'];
    expect(isDraw(squares)).toBe(false);
  });

  it('is false when the board still has empty squares', () => {
    expect(isDraw(Array(9).fill(null))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test`
Expected: FAIL — `src/gameLogic.js` does not exist / does not export `calculateWinner`/`isDraw`.

- [ ] **Step 3: Implement `calculateWinner` and `isDraw`**

Create `src/gameLogic.js`:

```js
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function calculateWinner(squares) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return null;
}

export function isDraw(squares) {
  return squares.every((square) => square !== null) && !calculateWinner(squares);
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — all `calculateWinner` and `isDraw` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/gameLogic.js src/gameLogic.test.js
git commit -m "feat: add calculateWinner and isDraw game logic"
```

---

### Task 3: Game logic — `getRandomMove` and `getBestMove` (minimax)

**Files:**
- Modify: `src/gameLogic.js`
- Modify: `src/gameLogic.test.js`

**Interfaces:**
- Consumes: `calculateWinner`, `isDraw` from Task 2 (same file, internal use).
- Produces: `getRandomMove(squares: Array<'X'|'O'|null>) -> number` (index of an empty square)
- Produces: `getBestMove(squares: Array<'X'|'O'|null>, aiPlayer: 'X'|'O') -> number` (optimal index for `aiPlayer`, unbeatable)

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/gameLogic.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { calculateWinner, isDraw, getRandomMove, getBestMove } from './gameLogic';

describe('calculateWinner', () => {
  it('detects each of the 8 winning lines', () => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const line of lines) {
      const squares = Array(9).fill(null);
      line.forEach((index) => {
        squares[index] = 'X';
      });
      const result = calculateWinner(squares);
      expect(result.winner).toBe('X');
      expect(result.line).toEqual(line);
    }
  });

  it('returns null for a board with no winner', () => {
    const squares = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(calculateWinner(squares)).toBeNull();
  });

  it('returns null for an empty board', () => {
    expect(calculateWinner(Array(9).fill(null))).toBeNull();
  });
});

describe('isDraw', () => {
  it('is true when the board is full and there is no winner', () => {
    const squares = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(isDraw(squares)).toBe(true);
  });

  it('is false when the board is full but there is a winner', () => {
    const squares = ['X', 'X', 'X', 'O', 'O', 'X', 'X', 'O', 'O'];
    expect(isDraw(squares)).toBe(false);
  });

  it('is false when the board still has empty squares', () => {
    expect(isDraw(Array(9).fill(null))).toBe(false);
  });
});

describe('getRandomMove', () => {
  it('always returns an index of an empty square', () => {
    const squares = ['X', null, 'O', null, 'X', null, 'O', null, null];
    for (let i = 0; i < 20; i++) {
      const move = getRandomMove(squares);
      expect(squares[move]).toBeNull();
    }
  });
});

describe('getBestMove', () => {
  it('takes the immediate winning move when available', () => {
    const squares = ['X', 'X', null, 'O', 'O', null, null, null, null];
    expect(getBestMove(squares, 'X')).toBe(2);
  });

  it("blocks the opponent's immediate winning move", () => {
    const squares = ['O', 'O', null, 'X', null, null, null, null, null];
    expect(getBestMove(squares, 'X')).toBe(2);
  });

  it('never loses when playing a full game against a random opponent', () => {
    for (let game = 0; game < 20; game++) {
      const squares = Array(9).fill(null);
      let player = 'X';
      while (!calculateWinner(squares) && !isDraw(squares)) {
        const move = player === 'X' ? getBestMove(squares, 'X') : getRandomMove(squares);
        squares[move] = player;
        player = player === 'X' ? 'O' : 'X';
      }
      const result = calculateWinner(squares);
      expect(result === null || result.winner === 'X').toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify the new ones fail**

Run: `npm test`
Expected: FAIL — `getRandomMove`/`getBestMove` not exported from `src/gameLogic.js` (existing `calculateWinner`/`isDraw` tests still pass).

- [ ] **Step 3: Implement `getRandomMove` and `getBestMove`**

Append to `src/gameLogic.js`:

```js
export function getRandomMove(squares) {
  const emptyIndices = squares
    .map((value, index) => (value === null ? index : null))
    .filter((index) => index !== null);
  const randomIndex = Math.floor(Math.random() * emptyIndices.length);
  return emptyIndices[randomIndex];
}

function getOpponent(player) {
  return player === 'X' ? 'O' : 'X';
}

function minimax(squares, player, aiPlayer) {
  const winnerInfo = calculateWinner(squares);
  if (winnerInfo) {
    return winnerInfo.winner === aiPlayer ? 10 : -10;
  }
  if (isDraw(squares)) {
    return 0;
  }

  const emptyIndices = squares
    .map((value, index) => (value === null ? index : null))
    .filter((index) => index !== null);

  const scores = emptyIndices.map((index) => {
    const nextSquares = squares.slice();
    nextSquares[index] = player;
    return minimax(nextSquares, getOpponent(player), aiPlayer);
  });

  return player === aiPlayer ? Math.max(...scores) : Math.min(...scores);
}

export function getBestMove(squares, aiPlayer) {
  const emptyIndices = squares
    .map((value, index) => (value === null ? index : null))
    .filter((index) => index !== null);

  let bestScore = -Infinity;
  let bestMove = emptyIndices[0];

  for (const index of emptyIndices) {
    const nextSquares = squares.slice();
    nextSquares[index] = aiPlayer;
    const score = minimax(nextSquares, getOpponent(aiPlayer), aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — all tests in `src/gameLogic.test.js` green.

- [ ] **Step 5: Commit**

```bash
git add src/gameLogic.js src/gameLogic.test.js
git commit -m "feat: add getRandomMove and minimax getBestMove"
```

---

### Task 4: `Square` and `Board` components + full component stylesheet

**Files:**
- Create: `src/components/Square.jsx`
- Create: `src/components/Board.jsx`
- Create: `src/App.css`

**Interfaces:**
- Produces: `<Square value={'X'|'O'|null} onClick={fn} isWinning={boolean} disabled={boolean} />`
- Produces: `<Board squares={Array(9)} winningLine={number[]|null} onSquareClick={(index) => void} disabled={boolean} />`
- CSS class names produced here (`button`, `button--active`, `button--primary`, `button--secondary`, `game`, `score-board`, `score-board__item`, `score-board__label`, `score-board__value`, `status-bar`, `board`, `square`, `square--winning`, `controls`, `mode-select`, `mode-select__group`) are consumed by Tasks 5–8.

- [ ] **Step 1: Create `src/components/Square.jsx`**

```jsx
export default function Square({ value, onClick, isWinning, disabled }) {
  const className = `square${isWinning ? ' square--winning' : ''}`;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || value !== null}
    >
      {value}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/Board.jsx`**

```jsx
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
```

- [ ] **Step 3: Create `src/App.css`** (full component stylesheet, used by this and later tasks)

```css
.mode-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.mode-select h1 {
  margin: 0 0 8px;
  font-size: 1.5rem;
}

.mode-select__group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.button {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.button:hover {
  border-color: var(--color-accent);
}

.button--active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.button--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
  width: 100%;
}

.button--primary:hover {
  opacity: 0.9;
}

.button--secondary {
  background: transparent;
}

.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.score-board {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.score-board__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.score-board__value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.status-bar {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.square {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-accent);
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.square:disabled {
  cursor: not-allowed;
}

.square:not(:disabled):hover {
  background: var(--color-accent-soft);
}

.square--winning {
  background: var(--color-accent);
  color: white;
}

.controls {
  display: flex;
  gap: 8px;
  width: 100%;
}
```

- [ ] **Step 4: Import the new stylesheet in `src/App.jsx`**

Modify `src/App.jsx` (add the import line, keep the rest of the placeholder as-is):

```jsx
import './App.css';

export default function App() {
  return (
    <div className="app">
      <div className="card">Tic Tac Toe</div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Square.jsx src/components/Board.jsx src/App.css src/App.jsx
git commit -m "feat: add Square and Board components with app stylesheet"
```

---

### Task 5: `StatusBar` and `ScoreBoard` components

**Files:**
- Create: `src/components/StatusBar.jsx`
- Create: `src/components/ScoreBoard.jsx`

**Interfaces:**
- Consumes: CSS classes `status-bar`, `score-board`, `score-board__item`, `score-board__label`, `score-board__value` from Task 4.
- Produces: `<StatusBar currentPlayer={'X'|'O'} winner={'X'|'O'|null} isDraw={boolean} />`
- Produces: `<ScoreBoard scores={{ X: number, O: number, draws: number }} />`

- [ ] **Step 1: Create `src/components/StatusBar.jsx`**

```jsx
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
```

- [ ] **Step 2: Create `src/components/ScoreBoard.jsx`**

```jsx
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
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatusBar.jsx src/components/ScoreBoard.jsx
git commit -m "feat: add StatusBar and ScoreBoard components"
```

---

### Task 6: `Controls` and `ModeSelect` components

**Files:**
- Create: `src/components/Controls.jsx`
- Create: `src/components/ModeSelect.jsx`

**Interfaces:**
- Consumes: CSS classes `controls`, `button`, `button--secondary`, `mode-select`, `mode-select__group`, `button--active`, `button--primary` from Task 4.
- Produces: `<Controls onRestart={fn} onChangeMode={fn} />`
- Produces: `<ModeSelect onStart={(mode: '2p'|'vsComputer', difficulty: 'easy'|'hard'|null) => void} />`

- [ ] **Step 1: Create `src/components/Controls.jsx`**

```jsx
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
```

- [ ] **Step 2: Create `src/components/ModeSelect.jsx`**

```jsx
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
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Controls.jsx src/components/ModeSelect.jsx
git commit -m "feat: add Controls and ModeSelect components"
```

---

### Task 7: `Game` component (wiring + AI turn logic)

**Files:**
- Create: `src/components/Game.jsx`

**Interfaces:**
- Consumes: `calculateWinner`, `isDraw`, `getRandomMove`, `getBestMove` from `src/gameLogic.js` (Tasks 2–3); `Board` (Task 4); `StatusBar`, `ScoreBoard` (Task 5); `Controls` (Task 6).
- Produces: `<Game mode={'2p'|'vsComputer'} difficulty={'easy'|'hard'|null} scores={{X,O,draws}} onRoundEnd={(winner: 'X'|'O'|null) => void} onChangeMode={fn} />`. `onRoundEnd` is called exactly once per finished round, with the winner symbol or `null` for a draw.

- [ ] **Step 1: Create `src/components/Game.jsx`**

```jsx
import { useEffect, useState } from 'react';
import Board from './Board';
import StatusBar from './StatusBar';
import ScoreBoard from './ScoreBoard';
import Controls from './Controls';
import { calculateWinner, isDraw as checkIsDraw, getRandomMove, getBestMove } from '../gameLogic';

const HUMAN_PLAYER = 'X';
const COMPUTER_PLAYER = 'O';
const AI_MOVE_DELAY_MS = 500;

function emptyBoard() {
  return Array(9).fill(null);
}

export default function Game({ mode, difficulty, scores, onRoundEnd, onChangeMode }) {
  const [squares, setSquares] = useState(emptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState(HUMAN_PLAYER);
  const [roundOver, setRoundOver] = useState(false);

  const winnerInfo = calculateWinner(squares);
  const draw = !winnerInfo && checkIsDraw(squares);

  useEffect(() => {
    if (winnerInfo || draw) {
      if (!roundOver) {
        setRoundOver(true);
        onRoundEnd(winnerInfo ? winnerInfo.winner : null);
      }
      return;
    }

    if (mode === 'vsComputer' && currentPlayer === COMPUTER_PLAYER) {
      const timeoutId = setTimeout(() => {
        const move =
          difficulty === 'hard'
            ? getBestMove(squares, COMPUTER_PLAYER)
            : getRandomMove(squares);
        applyMove(move);
      }, AI_MOVE_DELAY_MS);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squares, currentPlayer, mode, difficulty, roundOver]);

  function applyMove(index) {
    setSquares((prev) => {
      if (prev[index] !== null) {
        return prev;
      }
      const next = prev.slice();
      next[index] = currentPlayer;
      return next;
    });
    setCurrentPlayer((prev) => (prev === 'X' ? 'O' : 'X'));
  }

  function handleSquareClick(index) {
    if (roundOver || squares[index] !== null) {
      return;
    }
    if (mode === 'vsComputer' && currentPlayer === COMPUTER_PLAYER) {
      return;
    }
    applyMove(index);
  }

  function handleRestart() {
    setSquares(emptyBoard());
    setCurrentPlayer(HUMAN_PLAYER);
    setRoundOver(false);
  }

  return (
    <div className="game">
      <ScoreBoard scores={scores} />
      <StatusBar
        currentPlayer={currentPlayer}
        winner={winnerInfo ? winnerInfo.winner : null}
        isDraw={draw}
      />
      <Board
        squares={squares}
        winningLine={winnerInfo ? winnerInfo.line : null}
        onSquareClick={handleSquareClick}
        disabled={roundOver || (mode === 'vsComputer' && currentPlayer === COMPUTER_PLAYER)}
      />
      <Controls onRestart={handleRestart} onChangeMode={onChangeMode} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Game.jsx
git commit -m "feat: add Game component with AI turn handling"
```

---

### Task 8: `App` wiring, final build check, and manual QA

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `ModeSelect` (Task 6), `Game` (Task 7).
- Produces: the complete app entry point — no further tasks depend on this one.

- [ ] **Step 1: Replace `src/App.jsx` with the full implementation**

```jsx
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
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all `src/gameLogic.test.js` tests green (unaffected by this task, confirms nothing broke).

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual QA in the browser**

Run: `npm run dev`, open the printed local URL in a browser, and verify:
- Mode Select shows "2 Player" / "vs Computer" toggle, and "Easy" / "Hard" only appears when "vs Computer" is selected.
- **2 Player mode:** X and O alternate turns correctly; a win highlights the winning line and shows "X wins!"/"O wins!"; a full board with no winner shows "It's a draw!"; ScoreBoard tallies update accordingly.
- **vs Computer / Easy:** after the human (X) moves, the computer (O) moves automatically after a short delay with a beatable, sometimes-random move.
- **vs Computer / Hard:** the computer never loses across several played-out rounds (best case for the human is a draw).
- **Restart:** starts a new round with an empty board and keeps the ScoreBoard tallies.
- **Change Mode:** returns to Mode Select and resets the ScoreBoard to zero.

Expected: all behaviors match: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire up App view switching and finish Tic Tac Toe game"
```
