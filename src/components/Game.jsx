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
