import { useEffect, useReducer, useRef } from 'react';
import {
  calculateWinner,
  isDraw,
  getRandomMove,
  getMediumMove,
  getBestMove,
} from './gameLogic';

export const HUMAN_PLAYER = 'X';
export const COMPUTER_PLAYER = 'O';

// How long the computer sits on a move before playing it. Scaled by difficulty
// so the pause reads as effort rather than as a fixed interface stall — a
// perfect player that answers as fast as a random one feels wrong.
const THINKING_MS = { easy: 320, medium: 480, hard: 620 };

// How long a finished board is held before the next round is dealt. Long enough
// for the winning line to finish drawing and be read, short enough that you
// never reach for a button.
export const ROUND_END_HOLD_MS = 1400;

const INITIAL_SCORES = { X: 0, O: 0, draws: 0 };

function emptyBoard() {
  return Array(9).fill(null);
}

function opponent(player) {
  return player === 'X' ? 'O' : 'X';
}

function freshRound(starter) {
  return {
    squares: emptyBoard(),
    currentPlayer: starter,
    starter,
    status: 'playing',
    winner: null,
    winningLine: null,
  };
}

const initialState = { ...freshRound(HUMAN_PLAYER), scores: INITIAL_SCORES };

// Settles the board after `player` moved: either the round ends (and the score
// for it is banked in the same transition) or the turn passes to the opponent.
function settle(state, squares, player) {
  const win = calculateWinner(squares);
  if (win) {
    return {
      ...state,
      squares,
      currentPlayer: player,
      status: 'won',
      winner: win.winner,
      winningLine: win.line,
      scores: { ...state.scores, [win.winner]: state.scores[win.winner] + 1 },
    };
  }

  if (isDraw(squares)) {
    return {
      ...state,
      squares,
      currentPlayer: player,
      status: 'draw',
      scores: { ...state.scores, draws: state.scores.draws + 1 },
    };
  }

  return { ...state, squares, currentPlayer: opponent(player) };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'play': {
      const { index, player } = action;
      const illegal =
        state.status !== 'playing' ||
        player !== state.currentPlayer ||
        typeof index !== 'number' ||
        state.squares[index] !== null;
      if (illegal) {
        return state;
      }

      const squares = state.squares.slice();
      squares[index] = player;
      return settle(state, squares, player);
    }
    // Deals the next board within the same session. The starter alternates so
    // neither player keeps the first-move advantage across a long session.
    case 'nextRound':
      return { ...freshRound(opponent(state.starter)), scores: state.scores };
    // The only way back to 0-0-0 without leaving the session. Rounds advance on
    // their own, so this is about the score, not about the board.
    case 'resetScores':
      return { ...freshRound(HUMAN_PLAYER), scores: INITIAL_SCORES };
    default:
      return state;
  }
}

/**
 * Owns everything that changes as a round is played: the board, whose turn it
 * is, how the round ended, and the running score across rounds. Every move is a
 * single reducer transition, so a rejected move can never advance the turn.
 *
 * Rounds advance themselves: a finished board is held briefly and then replaced,
 * so a session is a continuous run of rounds rather than a series of stops.
 *
 * `onEvent` is notified of the moments worth reacting to ('place', 'win',
 * 'draw') so feedback stays out of here.
 */
export function useGame({ mode, difficulty, onEvent }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { squares, currentPlayer, starter, status, winner } = state;

  // Kept in a ref so a caller passing an inline callback can't retrigger the
  // effects below.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const computerThinking =
    mode === 'vsComputer' && currentPlayer === COMPUTER_PLAYER && status === 'playing';

  useEffect(() => {
    if (!computerThinking) {
      return;
    }
    const timeoutId = setTimeout(() => {
      let index;
      if (difficulty === 'hard') {
        index = getBestMove(squares, COMPUTER_PLAYER);
      } else if (difficulty === 'medium') {
        index = getMediumMove(squares, COMPUTER_PLAYER);
      } else {
        index = getRandomMove(squares);
      }
      dispatch({ type: 'play', index, player: COMPUTER_PLAYER });
    }, THINKING_MS[difficulty] ?? THINKING_MS.medium);
    return () => clearTimeout(timeoutId);
  }, [computerThinking, squares, difficulty]);

  // Hold the finished board, then deal the next one. Cleanup covers both an
  // unmount and a score reset landing mid-hold.
  useEffect(() => {
    if (status === 'playing') {
      return;
    }
    const timeoutId = setTimeout(() => dispatch({ type: 'nextRound' }), ROUND_END_HOLD_MS);
    return () => clearTimeout(timeoutId);
  }, [status]);

  // Marks only ever get added within a round, so the count rising means a mark
  // just landed; it dropping to zero means a new board was dealt. Marks
  // alternate from the starter, so the count also says whose mark it was.
  const markCount = squares.filter(Boolean).length;
  useEffect(() => {
    if (markCount > 0) {
      onEventRef.current?.('place', markCount % 2 === 1 ? starter : opponent(starter));
    }
  }, [markCount, starter]);

  useEffect(() => {
    if (status === 'won') {
      onEventRef.current?.('win', winner);
    } else if (status === 'draw') {
      onEventRef.current?.('draw');
    }
  }, [status, winner]);

  const boardLocked = status !== 'playing' || computerThinking;

  return {
    ...state,
    roundOver: status !== 'playing',
    boardLocked,
    computerThinking,
    playSquare(index) {
      if (boardLocked) {
        return;
      }
      dispatch({ type: 'play', index, player: currentPlayer });
    },
    resetScores() {
      dispatch({ type: 'resetScores' });
    },
  };
}
