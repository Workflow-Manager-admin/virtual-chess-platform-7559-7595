import React, { useState, useEffect } from 'react';
import './App.css';

// --- Chess Utilities ---

const PIECE_TYPES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const initialBoard = () => [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

function isWhite(piece) {
  return piece && piece[0] === 'w';
}

function isBlack(piece) {
  return piece && piece[0] === 'b';
}

function algebraic(col, row) {
  return String.fromCharCode(97 + col) + (8 - row);
}

// Basic move validation (excluding castling, en passant, pawn promotion)
function getValidMoves(board, from, turn) {
  const [fr, fc] = from;
  const piece = board[fr][fc];
  if (!piece) return [];
  const is_white_turn = turn === 'white';
  const moves = [];
  const dir = is_white_turn ? -1 : 1; // Pawn direction

  const addMove = (tr, tc, captureRequired = false) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
    const dest = board[tr][tc];
    if (!captureRequired && !dest) moves.push([tr, tc]);
    if (captureRequired && dest && ((is_white_turn && isBlack(dest)) || (!is_white_turn && isWhite(dest)))) {
      moves.push([tr, tc]);
    }
  };

  const colorMatch = is_white_turn ? isWhite : isBlack;
  const enemyMatch = is_white_turn ? isBlack : isWhite;

  switch (piece[1]) {
    case 'P': {
      // One forward
      if (!board[fr + dir]?.[fc])
        addMove(fr + dir, fc);
      // First move two forward
      if ((is_white_turn && fr === 6) || (!is_white_turn && fr === 1)) {
        if (!board[fr + dir]?.[fc] && !board[fr + 2 * dir]?.[fc])
          addMove(fr + 2 * dir, fc);
      }
      // Diagonal capt
      addMove(fr + dir, fc + 1, true);
      addMove(fr + dir, fc - 1, true);
      break;
    }
    case 'N': {
      for (let [dr, dc] of [
        [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]
      ]) {
        const tr = fr + dr, tc = fc + dc;
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
        if (!board[tr][tc] || enemyMatch(board[tr][tc]))
          moves.push([tr, tc]);
      }
      break;
    }
    case 'B': {
      for (let [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        for (let d = 1; d < 8; d++) {
          const tr = fr + dr * d, tc = fc + dc * d;
          if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
          if (!board[tr][tc])
            moves.push([tr, tc]);
          else {
            if (enemyMatch(board[tr][tc])) moves.push([tr, tc]);
            break;
          }
        }
      }
      break;
    }
    case 'R': {
      for (let [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        for (let d = 1; d < 8; d++) {
          const tr = fr + dr * d, tc = fc + dc * d;
          if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
          if (!board[tr][tc])
            moves.push([tr, tc]);
          else {
            if (enemyMatch(board[tr][tc])) moves.push([tr, tc]);
            break;
          }
        }
      }
      break;
    }
    case 'Q': {
      // Queen = bishop + rook
      for (let [dr, dc] of [
        [1, 1], [1, -1], [-1, 1], [-1, -1],
        [0, 1], [1, 0], [0, -1], [-1, 0]
      ]) {
        for (let d = 1; d < 8; d++) {
          const tr = fr + dr * d, tc = fc + dc * d;
          if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
          if (!board[tr][tc])
            moves.push([tr, tc]);
          else {
            if (enemyMatch(board[tr][tc])) moves.push([tr, tc]);
            break;
          }
        }
      }
      break;
    }
    case 'K': {
      for (let dr of [-1, 0, 1])
        for (let dc of [-1, 0, 1]) {
          if (dr === 0 && dc === 0) continue;
          const tr = fr + dr, tc = fc + dc;
          if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
          if (!board[tr][tc] || enemyMatch(board[tr][tc]))
            moves.push([tr, tc]);
        }
      break;
    }
    default: break;
  }
  // Remove moves that land on own piece
  return moves.filter(([tr, tc]) => !colorMatch(board[tr][tc]));
}

// Make a deep copy of the board
function deepCopy(board) {
  return board.map(row => row.slice());
}

// --- UI Components ---

// PUBLIC_INTERFACE
function ChessBoard({
  board,
  selected,
  validMoves,
  onSquareClick,
  orientation = 'white',
}) {
  // Renders an 8x8 chess board from board state
  const rows = [...Array(8)].map((_, i) => i);
  const cols = [...Array(8)].map((_, i) => i);

  const renderSquare = (row, col) => {
    let highlight = '';
    if (selected && selected[0] === row && selected[1] === col)
      highlight = 'selected';
    else if (
      validMoves?.some(([r, c]) => r === row && c === col)
    )
      highlight = 'valid-move';

    let even = (row + col) % 2 === 0;
    let lightSquare = even;

    // Flip for black orientation (for minimal flip complexity)
    let renderRow = orientation === 'white' ? row : 7 - row;
    let renderCol = orientation === 'white' ? col : 7 - col;

    return (
      <div
        className={`square ${lightSquare ? 'light' : 'dark'} ${highlight}`}
        key={`${row}_${col}`}
        onClick={() => onSquareClick(renderRow, renderCol)}
        tabIndex={0}
        aria-label={`Square ${algebraic(renderCol, renderRow)}${board[renderRow][renderCol] ? ' with ' + board[renderRow][renderCol]: ''}`}
      >
        {PIECE_TYPES[board[renderRow][renderCol]] ?
          <span className={`piece ${isWhite(board[renderRow][renderCol]) ? 'white' : 'black'}`}>
            {PIECE_TYPES[board[renderRow][renderCol]]}
          </span> : ''}
      </div>
    );
  };

  return (
    <div className="board-outer">
      <div className="chess-board">
        {rows.map(row =>
          cols.map(col =>
            renderSquare(row, col)
          )
        )}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function MoveHistory({ moves, onSelectMove }) {
  return (
    <div className="move-history">
      <h3>Move History</h3>
      <ol>
        {moves.map((move, i) => (
          <li key={i}
              tabIndex={0}
              className="move-item"
              onClick={() => onSelectMove && onSelectMove(i)}
          >
            {move.san} <span className="move-label">
            {move.whitePiece ?
              PIECE_TYPES[move.whitePiece]
              : move.blackPiece ?
                PIECE_TYPES[move.blackPiece] : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// PUBLIC_INTERFACE
function ChessControls({
  turn,
  orientation,
  flipBoard,
  resetBoard,
}) {
  return (
    <div className="controls-panel">
      <div>
        <strong>Turn: </strong>
        <span className={turn === 'white' ? 'turn-white' : 'turn-black'}>
          {turn.charAt(0).toUpperCase() + turn.slice(1)}
        </span>
      </div>
      <button className="btn-accent" onClick={flipBoard}>Flip Board</button>
      <button className="btn" onClick={resetBoard}>Reset</button>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Chessboard state
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('white');
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [orientation, setOrientation] = useState('white');
  const [theme, setTheme] = useState('dark');

  // Effect for dark theme init (auto on load)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Reset board state
  // PUBLIC_INTERFACE
  const resetBoard = () => {
    setBoard(initialBoard());
    setTurn('white');
    setSelected(null);
    setValidMoves([]);
    setMoveHistory([]);
  };

  // PUBLIC_INTERFACE
  const flipBoard = () => {
    setOrientation(cur => (cur === 'white' ? 'black' : 'white'));
  };

  // PUBLIC_INTERFACE
  const onSquareClick = (row, col) => {
    const piece = board[row][col];
    const colorMatch = turn === 'white' ? isWhite : isBlack;
    // Select your own piece
    if (!selected) {
      if (piece && colorMatch(piece)) {
        setSelected([row, col]);
        setValidMoves(getValidMoves(board, [row, col], turn));
      }
      else {
        setSelected(null);
        setValidMoves([]);
      }
    }
    // If a piece is already selected
    else {
      if (selected[0] === row && selected[1] === col) { // Deselect
        setSelected(null);
        setValidMoves([]);
        return;
      }
      // If clicking on own other piece, change selection
      if (piece && colorMatch(piece)) {
        setSelected([row, col]);
        setValidMoves(getValidMoves(board, [row, col], turn));
        return;
      }
      // Attempt move to empty or enemy square
      const legalMoves = getValidMoves(board, selected, turn);
      if (legalMoves.some(([r, c]) => r === row && c === col)) {
        // Actually do the move
        const from = selected;
        const to = [row, col];
        let nextBoard = deepCopy(board);
        const movedPiece = nextBoard[from[0]][from[1]];
        const capturedPiece = nextBoard[to[0]][to[1]];

        // Move piece
        nextBoard[to[0]][to[1]] = movedPiece;
        nextBoard[from[0]][from[1]] = null;

        // Pawn promotion (minimal: auto promote to queen)
        if (movedPiece[1] === 'P' && (to[0] === 0 || to[0] === 7)) {
          nextBoard[to[0]][to[1]] = movedPiece[0] + 'Q';
        }

        // Move SAN (basic, not fully PGN)
        const san =
          PIECE_TYPES[movedPiece] +
          (capturedPiece ? 'x' : '-') +
          algebraic(to[1], to[0]);
        setBoard(nextBoard);
        setTurn(turn === 'white' ? 'black' : 'white');
        setMoveHistory([
          ...moveHistory,
          {
            from: algebraic(from[1], from[0]),
            to: algebraic(to[1], to[0]),
            san: san,
            whitePiece: turn === 'white' ? movedPiece : null,
            blackPiece: turn === 'black' ? movedPiece : null,
            captured: capturedPiece,
          }
        ]);
        setSelected(null);
        setValidMoves([]);
      } else {
        // Clicking elsewhere with no effect: deselect
        setSelected(null);
        setValidMoves([]);
      }
    }
  };

  // PUBLIC_INTERFACE
  const toggleTheme = () =>
    setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="App">
      <header className="App-header chess-app-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div className="main-app-container">
          <div className="board-section">
            <ChessBoard
              board={board}
              selected={selected}
              validMoves={validMoves}
              onSquareClick={onSquareClick}
              orientation={orientation}
            />
            <ChessControls
              turn={turn}
              orientation={orientation}
              flipBoard={flipBoard}
              resetBoard={resetBoard}
            />
          </div>
          <div className="side-panel">
            <MoveHistory moves={moveHistory} />
          </div>
        </div>
        <footer className="footer-credit">
          <span>Virtual Chess Platform &copy; {new Date().getFullYear()}</span>
        </footer>
      </header>
    </div>
  );
}

export default App;
