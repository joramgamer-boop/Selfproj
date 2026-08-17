import { describe, it, expect } from 'vitest';
import {
  calculateWinner,
  isDraw,
  getRandomMove,
  getBestMove,
  getMediumMove,
  MEDIUM_BLUNDER_CHANCE,
} from './gameLogic';

// Hands out a scripted run of "random" numbers, so a blunder can be forced or
// forbidden precisely instead of hoping for it over enough iterations.
function sequence(...values) {
  let call = 0;
  return () => values[call++];
}

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

describe('getMediumMove', () => {
  // Empty squares are [2, 5, 6, 7, 8]; 2 both wins for X and is the only best
  // move, so a blunder is unmistakable.
  const squares = ['X', 'X', null, 'O', 'O', null, null, null, null];

  it('plays the best move when the roll clears the blunder chance', () => {
    expect(getMediumMove(squares, 'X', sequence(MEDIUM_BLUNDER_CHANCE))).toBe(
      getBestMove(squares, 'X'),
    );
  });

  it('throws the move away when the roll lands under the blunder chance', () => {
    // Second value picks the 5th of the 5 empty squares.
    const move = getMediumMove(squares, 'X', sequence(MEDIUM_BLUNDER_CHANCE - 0.01, 0.9));
    expect(move).toBe(8);
    expect(move).not.toBe(getBestMove(squares, 'X'));
  });

  it('only ever returns an empty square, however it rolls', () => {
    const board = ['X', null, 'O', null, 'X', null, 'O', null, null];
    for (let i = 0; i < 40; i++) {
      expect(board[getMediumMove(board, 'O')]).toBeNull();
    }
  });
});
