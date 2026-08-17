import { describe, it, expect } from 'vitest';
import { gameReducer } from './useGame';

const EMPTY = Array(9).fill(null);

function newGame(overrides = {}) {
  return {
    squares: EMPTY.slice(),
    currentPlayer: 'X',
    starter: 'X',
    status: 'playing',
    winner: null,
    winningLine: null,
    scores: { X: 0, O: 0, draws: 0 },
    ...overrides,
  };
}

function play(state, index, player) {
  return gameReducer(state, { type: 'play', index, player });
}

describe('gameReducer / play', () => {
  it('places the mark and passes the turn', () => {
    const next = play(newGame(), 4, 'X');
    expect(next.squares[4]).toBe('X');
    expect(next.currentPlayer).toBe('O');
    expect(next.status).toBe('playing');
  });

  it('does not mutate the previous board', () => {
    const state = newGame();
    play(state, 0, 'X');
    expect(state.squares).toEqual(EMPTY);
  });

  // Regression: a rejected move used to place nothing but still flip the turn,
  // handing the move to the other player.
  it('leaves the turn alone when the square is taken', () => {
    const state = play(newGame(), 0, 'X');
    expect(play(state, 0, 'O')).toBe(state);
  });

  it('ignores a move from the player whose turn it is not', () => {
    const state = newGame();
    expect(play(state, 0, 'O')).toBe(state);
  });

  it('ignores moves once the round is over', () => {
    const state = newGame({ status: 'won', winner: 'X' });
    expect(play(state, 8, 'X')).toBe(state);
  });

  it('ignores a move with no index', () => {
    const state = newGame();
    expect(play(state, undefined, 'X')).toBe(state);
  });

  it('records the winner, the winning line and the score in one step', () => {
    const state = newGame({ squares: ['X', 'X', null, 'O', 'O', null, null, null, null] });
    const next = play(state, 2, 'X');
    expect(next.status).toBe('won');
    expect(next.winner).toBe('X');
    expect(next.winningLine).toEqual([0, 1, 2]);
    expect(next.scores).toEqual({ X: 1, O: 0, draws: 0 });
  });

  it('records a draw when the last square fills without a winner', () => {
    const state = newGame({
      squares: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null],
      currentPlayer: 'X',
    });
    const next = play(state, 8, 'X');
    expect(next.status).toBe('draw');
    expect(next.winner).toBeNull();
    expect(next.scores).toEqual({ X: 0, O: 0, draws: 1 });
  });

  it('banks the score exactly once for a round', () => {
    const won = play(newGame({ squares: ['X', 'X', null, 'O', 'O', null, null, null, null] }), 2, 'X');
    const after = play(won, 5, 'O');
    expect(after.scores).toEqual({ X: 1, O: 0, draws: 0 });
  });
});

describe('gameReducer / nextRound', () => {
  it('clears the board and keeps the running score', () => {
    const won = play(newGame({ squares: ['X', 'X', null, 'O', 'O', null, null, null, null] }), 2, 'X');
    const next = gameReducer(won, { type: 'nextRound' });

    expect(next.squares).toEqual(EMPTY);
    expect(next.status).toBe('playing');
    expect(next.winner).toBeNull();
    expect(next.winningLine).toBeNull();
    expect(next.scores).toEqual({ X: 1, O: 0, draws: 0 });
  });

  // Rounds run back to back now, so a fixed starter would be a standing
  // first-move advantage rather than a one-off one.
  it('hands the first move to the other player', () => {
    const next = gameReducer(newGame({ starter: 'X' }), { type: 'nextRound' });
    expect(next.starter).toBe('O');
    expect(next.currentPlayer).toBe('O');
  });

  it('alternates back again on the round after', () => {
    const second = gameReducer(newGame({ starter: 'X' }), { type: 'nextRound' });
    const third = gameReducer(second, { type: 'nextRound' });
    expect([second.starter, third.starter]).toEqual(['O', 'X']);
  });
});

describe('gameReducer / resetScores', () => {
  it('zeroes every tally and starts over from X', () => {
    const won = play(
      newGame({ squares: ['X', 'X', null, 'O', 'O', null, null, null, null], starter: 'O' }),
      2,
      'X',
    );
    const next = gameReducer(won, { type: 'resetScores' });

    expect(next.scores).toEqual({ X: 0, O: 0, draws: 0 });
    expect(next.squares).toEqual(EMPTY);
    expect(next.starter).toBe('X');
    expect(next.currentPlayer).toBe('X');
    expect(next.status).toBe('playing');
  });
});
