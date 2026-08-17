import Board from './Board';
import StatusBar from './StatusBar';
import ScoreBoard from './ScoreBoard';
import Controls from './Controls';
import { useGame } from '../useGame';
import { useFeedback } from '../useFeedback';

export default function Game({ mode, difficulty, onChangeMode }) {
  const feedback = useFeedback();
  const {
    squares,
    currentPlayer,
    status,
    winner,
    winningLine,
    scores,
    boardLocked,
    computerThinking,
    playSquare,
    resetScores,
  } = useGame({ mode, difficulty, onEvent: feedback.play });

  return (
    <div className="game">
      <ScoreBoard scores={scores} mode={mode} />
      <StatusBar
        status={status}
        currentPlayer={currentPlayer}
        winner={winner}
        mode={mode}
        computerThinking={computerThinking}
      />
      <Board
        squares={squares}
        winningLine={winningLine}
        winner={winner}
        // Only offer a preview when the square could actually be taken next.
        nextPlayer={boardLocked ? undefined : currentPlayer}
        onSquareClick={playSquare}
        disabled={boardLocked}
      />
      <Controls
        onResetScores={resetScores}
        onChangeMode={onChangeMode}
        soundEnabled={feedback.enabled}
        onToggleSound={feedback.toggle}
      />
    </div>
  );
}
