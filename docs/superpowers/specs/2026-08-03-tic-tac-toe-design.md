# Tic Tac Toe Practice Website — Design

## Summary
A small, self-contained Tic Tac Toe website built with Vite + React (JavaScript) for practice purposes. Supports local 2-player play and play against a computer opponent with selectable difficulty (Easy/random or Hard/unbeatable minimax). Clean, modern visual style. No backend, no persistence beyond the current browser session.

## Goals
- Just Tic Tac Toe for now (not a multi-game hub).
- Two game modes: 2-Player (local, same screen) and vs Computer.
- vs Computer supports selectable difficulty: Easy (random moves) or Hard (minimax, unbeatable).
- Score tracking across rounds (X wins / O wins / draws).
- Winning line is visually highlighted.
- Clean/modern visual style: centered card layout, neutral palette, one accent color, subtle animations.

## Non-Goals
- No other games, no landing-page hub.
- No backend, no accounts, no persistence across browser sessions/reloads.
- No routing library — the app has two simple views managed via local state.

## Tech Stack
- Vite + React (JavaScript, no TypeScript).
- Plain CSS for styling (no CSS framework).
- Vitest for unit tests of the game logic module.
- Runs locally via `npm run dev`; can be built to static files via `npm run build` if ever hosted later.

## Architecture

### Views
The app has two top-level views, switched via state in `App`:
1. **Mode Select** — choose 2-Player or vs Computer (+ difficulty if vs Computer).
2. **Game** — the board, status, score, and controls.

### Components
- **`App`** — owns `view` state (`'select' | 'game'`), `mode` (`'2p' | 'vsComputer'`), `difficulty` (`'easy' | 'hard'`), and `scores` (`{ X, O, draws }`). Scores persist across rounds within a session and reset when the user changes mode.
- **`ModeSelect`** — UI for picking mode and (conditionally) difficulty; calls back to `App` to start a game.
- **`Game`** — owns per-round state: `squares` (array of 9), `currentPlayer` (`'X' | 'O'`), derived `winnerInfo` (`{ winner, line } | null`), derived `isDraw`. Renders `Board`, `StatusBar`, `ScoreBoard`, `Controls`. Triggers the AI move (with a short delay) when it's the computer's turn in vs Computer mode. Updates `App`'s scores when a round ends.
- **`Board`** — renders 9 `Square`s in a 3x3 grid; highlights the winning line's squares when `winnerInfo` is present.
- **`Square`** — a single clickable cell; disabled once filled or once the round is over.
- **`StatusBar`** — shows "X's turn", "O's turn", "X wins!", "O wins!", or "Draw!".
- **`ScoreBoard`** — displays the running `{ X, O, draws }` tally.
- **`Controls`** — "Restart" (new round, same mode/difficulty, keeps score) and "Change Mode" (returns to Mode Select, resets scores).

### Game Logic (`src/gameLogic.js`)
Pure functions, independent of React, unit-testable in isolation:
- `calculateWinner(squares)` → returns `{ winner, line }` (line = array of 3 winning indices) or `null`.
- `isDraw(squares)` → `true` if the board is full and there's no winner.
- `getRandomMove(squares)` → returns a random valid (empty) index. Used for Easy difficulty.
- `getBestMove(squares, aiPlayer)` → minimax implementation; returns the optimal index for `aiPlayer`. Used for Hard difficulty. Should never lose.

### Data Flow
1. Player clicks an empty `Square` → `Game` updates `squares`, checks `calculateWinner`/`isDraw`.
2. If the round ended, `Game` reports the result up to `App` to update `scores`; `StatusBar` shows the result; `Board` highlights the winning line if any.
3. If not ended and mode is vs Computer and it's now the AI's turn, `Game` waits briefly (e.g. ~500ms, for a natural feel) then computes and applies the AI's move via `getRandomMove` or `getBestMove` depending on `difficulty`.
4. "Restart" clears `squares`/`currentPlayer` for a new round without touching `scores` or `mode`.
5. "Change Mode" returns to `ModeSelect` and resets `scores` to zero.

## Styling
Centered card layout on a neutral background; one accent color used for the active player indicator, X/O marks, and the winning-line highlight. Subtle transition when a square is filled and when the winning line is highlighted. Responsive enough to look good on a laptop browser window (this is a local practice project, not aiming for mobile-first).

## Testing
- Vitest unit tests for `src/gameLogic.js`:
  - `calculateWinner`: detects all 8 winning lines, returns `null` for non-terminal/ongoing boards.
  - `isDraw`: true only when full and no winner.
  - `getBestMove`: never results in a loss when played against itself or a random opponent across sample games (sanity check on minimax correctness).
- No UI test framework; UI correctness verified manually by running the dev server in-browser (both game modes, both difficulties, restart, change mode, score persistence).

## Open Questions
None — all key decisions were made during brainstorming.
