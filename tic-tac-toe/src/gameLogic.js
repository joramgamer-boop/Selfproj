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

export function getRandomMove(squares, random = Math.random) {
  const emptyIndices = squares
    .map((value, index) => (value === null ? index : null))
    .filter((index) => index !== null);
  const randomIndex = Math.floor(random() * emptyIndices.length);
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

// How often Medium throws a move away. Tuned by feel: low enough that the
// computer still punishes careless play, high enough that a human who is paying
// attention gets openings. Perfect play (Hard) can only ever be drawn, so this
// blunder rate is the whole reason Medium is winnable.
export const MEDIUM_BLUNDER_CHANCE = 0.25;

// `random` is injectable so the blunder rate can be tested without stubbing
// Math.random globally.
export function getMediumMove(squares, aiPlayer, random = Math.random) {
  if (random() < MEDIUM_BLUNDER_CHANCE) {
    return getRandomMove(squares, random);
  }
  return getBestMove(squares, aiPlayer);
}
