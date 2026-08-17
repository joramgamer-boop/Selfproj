import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ROUND_END_HOLD_MS } from './useGame';

// Mode, difficulty and the sound setting persist, so a leftover choice from one
// test would otherwise decide what the next one starts on.
beforeEach(() => {
  window.localStorage.clear();
});

// Real timers throughout: user-event drives its own clock and deadlocks against
// vi's fake one, and the waits here are short enough not to be worth the fight.
const HOLD_TIMEOUT = ROUND_END_HOLD_MS + 3000;

const POSITIONS = [
  'top left',
  'top centre',
  'top right',
  'middle left',
  'centre',
  'middle right',
  'bottom left',
  'bottom centre',
  'bottom right',
];

function square(index) {
  return screen.getByRole('button', { name: new RegExp(`^${POSITIONS[index]},`) });
}

function scoreFor(label) {
  const board = document.querySelector('.score-board');
  const item = within(board).getByText(label).closest('.score-board__item');
  return within(item).getByText(/^\d+$/).textContent;
}

function status() {
  return screen.getByRole('status');
}

// The computer moves on a short timer that scales with difficulty; the default
// 1s waitFor window is not enough for two Hard moves in a row.
function waitForPlayerTurn() {
  return waitFor(() => expect(status()).toHaveTextContent('Your turn'), { timeout: 4000 });
}

async function startGame(user, { mode = '2 Player', difficulty } = {}) {
  await user.click(screen.getByRole('button', { name: mode }));
  if (difficulty) {
    await user.click(screen.getByRole('button', { name: difficulty }));
  }
  await user.click(screen.getByRole('button', { name: 'Start Game' }));
}

describe('ModeSelect', () => {
  it('shows the difficulty choice only for the computer mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('button', { name: 'Hard' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'vs Computer' }));
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2 Player' }));
    expect(screen.queryByRole('button', { name: 'Hard' })).not.toBeInTheDocument();
  });

  // Hard cannot be beaten, so landing a first-time visitor on it means their
  // opening experience is a game they cannot win.
  it('defaults to Medium rather than to a difficulty nobody can beat', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'vs Computer' }));
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('reopens on the mode and difficulty last played', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await startGame(user, { mode: 'vs Computer', difficulty: 'Easy' });
    first.unmount();

    render(<App />);
    expect(screen.getByRole('button', { name: 'vs Computer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('sound', () => {
  it('stays silent until asked, and remembers being asked', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await startGame(user);

    // Labelled by the action it performs, so "on" here means sound is off.
    await user.click(screen.getByRole('button', { name: 'Turn sound on' }));
    expect(screen.getByRole('button', { name: 'Turn sound off' })).toBeInTheDocument();
    first.unmount();

    render(<App />);
    await startGame(user);
    expect(screen.getByRole('button', { name: 'Turn sound off' })).toBeInTheDocument();
  });

  // jsdom has no AudioContext and no vibrate; a missing one must not be able to
  // stop a move landing.
  it('plays a full round with the audio APIs absent', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await user.click(screen.getByRole('button', { name: 'Turn sound on' }));

    for (const index of [0, 3, 1, 4, 2]) {
      await user.click(square(index));
    }

    expect(status()).toHaveTextContent('X wins!');
  });
});

describe('two-player game', () => {
  it('alternates turns as squares are claimed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    expect(screen.getByRole('status')).toHaveTextContent("X's turn");

    await user.click(square(0));
    expect(square(0)).toHaveTextContent('X');
    expect(screen.getByRole('status')).toHaveTextContent("O's turn");

    await user.click(square(4));
    expect(square(4)).toHaveTextContent('O');
    expect(screen.getByRole('status')).toHaveTextContent("X's turn");
  });

  it('cannot claim a square that is already taken', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    await user.click(square(0));
    await user.click(square(0));

    expect(square(0)).toHaveTextContent('X');
    expect(screen.getByRole('status')).toHaveTextContent("O's turn");
  });

  it('announces the winner, highlights the line and scores the round', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    // X: 0, 1, 2 — O: 3, 4
    for (const index of [0, 3, 1, 4, 2]) {
      await user.click(square(index));
    }

    expect(screen.getByRole('status')).toHaveTextContent('X wins!');
    expect(square(0)).toHaveClass('square--winning');
    expect(square(1)).toHaveClass('square--winning');
    expect(square(2)).toHaveClass('square--winning');
    expect(square(3)).not.toHaveClass('square--winning');
    expect(scoreFor('X')).toBe('1');
    expect(scoreFor('Draws')).toBe('0');
  });

  it('locks the board once the round is won', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    for (const index of [0, 3, 1, 4, 2]) {
      await user.click(square(index));
    }
    await user.click(square(8));

    expect(square(8)).toHaveTextContent('');
    expect(screen.getByRole('status')).toHaveTextContent('X wins!');
  });

  it('scores a draw', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    // X O X / X O O / O X X
    for (const index of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
      await user.click(square(index));
    }

    expect(screen.getByRole('status')).toHaveTextContent("It's a draw!");
    expect(scoreFor('Draws')).toBe('1');
    expect(scoreFor('X')).toBe('0');
    expect(scoreFor('O')).toBe('0');
  });

  it(
    'deals the next round on its own, with the other player starting',
    async () => {
      const user = userEvent.setup();
      render(<App />);
      await startGame(user);

      for (const index of [0, 3, 1, 4, 2]) {
        await user.click(square(index));
      }
      expect(status()).toHaveTextContent('X wins!');

      // No click here on purpose — the point is that play resumes unprompted.
      await waitFor(() => expect(status()).toHaveTextContent("O's turn"), {
        timeout: HOLD_TIMEOUT,
      });

      POSITIONS.forEach((_, index) => expect(square(index)).toHaveTextContent(''));
      expect(scoreFor('X')).toBe('1');
    },
    HOLD_TIMEOUT + 5000,
  );

  it('reset scores zeroes the tally and starts over from X', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    for (const index of [0, 3, 1, 4, 2]) {
      await user.click(square(index));
    }
    // Whether or not the round has auto-advanced by now, the result is the
    // same, so this asserts the reset rather than racing the hold.
    await user.click(screen.getByRole('button', { name: 'Reset scores' }));

    expect(status()).toHaveTextContent("X's turn");
    POSITIONS.forEach((_, index) => expect(square(index)).toHaveTextContent(''));
    expect(scoreFor('X')).toBe('0');
    expect(scoreFor('Draws')).toBe('0');
  });

  it('changing mode returns to the menu and starts a fresh score', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);

    for (const index of [0, 3, 1, 4, 2]) {
      await user.click(square(index));
    }
    await user.click(screen.getByRole('button', { name: 'Change Mode' }));

    expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument();

    await startGame(user);
    expect(scoreFor('X')).toBe('0');
  });
});

describe('game against the computer', () => {
  it('replies with a move of its own, then hands the turn back', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user, { mode: 'vs Computer', difficulty: 'Easy' });

    await user.click(square(4));
    expect(status()).toHaveTextContent('Computer is thinking');

    await waitForPlayerTurn();

    const marks = POSITIONS.map((_, index) => square(index).textContent);
    expect(marks.filter((mark) => mark === 'X')).toHaveLength(1);
    expect(marks.filter((mark) => mark === 'O')).toHaveLength(1);
  });

  it('locks the board while the computer is thinking', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user, { mode: 'vs Computer', difficulty: 'Easy' });

    await user.click(square(4));
    expect(square(0)).toBeDisabled();

    await user.click(square(0));
    expect(square(0)).toHaveTextContent('');
  });

  it('labels the scoreboard for the player and the computer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user, { mode: 'vs Computer', difficulty: 'Easy' });

    expect(screen.getByText('You (X)')).toBeInTheDocument();
    expect(screen.getByText('Computer (O)')).toBeInTheDocument();
  });

  it('on hard, the computer blocks an immediate win', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user, { mode: 'vs Computer', difficulty: 'Hard' });

    await user.click(square(0));
    await waitForPlayerTurn();
    await user.click(square(1));
    await waitForPlayerTurn();

    // X threatens 0-1-2, so O has to take square 2.
    expect(square(2)).toHaveTextContent('O');
  });
});
