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
