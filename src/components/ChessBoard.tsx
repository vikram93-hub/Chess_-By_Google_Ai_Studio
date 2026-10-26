import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessTheme, PieceSymbol, PlayerColor } from '../types/chess';
import { ChessPiece } from '../utils/chessPieces';

interface ChessBoardProps {
  game: Chess;
  theme: ChessTheme;
  orientation: 'white' | 'black';
  lastMove: { from: string; to: string } | null;
  isInteractive: boolean;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean | void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const EMPTY_SET = new Set<Square>();

interface DragState {
  square: Square;
  piece: { type: PieceSymbol; color: PlayerColor };
  x: number;
  y: number;
  size: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  theme,
  orientation,
  lastMove,
  isInteractive,
  onMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    square: Square;
    piece: { type: PieceSymbol; color: PlayerColor };
    startX: number;
    startY: number;
    size: number;
    isDragging: boolean;
  } | null>(null);

  // Determine ranks & files order based on orientation
  const displayRanks = useMemo(
    () => (orientation === 'white' ? RANKS : [...RANKS].reverse()),
    [orientation]
  );
  const displayFiles = useMemo(
    () => (orientation === 'white' ? FILES : [...FILES].reverse()),
    [orientation]
  );

  // Position FEN string for memoization cache key
  const fen = game.fen();

  // High-performance memoization: compute board pieces, check square, and legal moves map ONCE per position
  const { boardMap, checkSquare, legalMovesMap } = useMemo(() => {
    const board = game.board();
    const map: Partial<Record<Square, { type: PieceSymbol; color: PlayerColor }>> = {};
    let chkSquare: Square | null = null;
    const isCheck = game.inCheck();
    const currentTurn = game.turn();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        const sq = `${FILES[c]}${RANKS[r]}` as Square;
        if (p) {
          map[sq] = { type: p.type as PieceSymbol, color: p.color as PlayerColor };
          if (isCheck && p.type === 'k' && p.color === currentTurn) {
            chkSquare = sq;
          }
        }
      }
    }

    const movesMap: Partial<Record<Square, Set<Square>>> = {};
    const allMoves = game.moves({ verbose: true }) as Move[];
    for (const m of allMoves) {
      if (!movesMap[m.from]) {
        movesMap[m.from] = new Set();
      }
      movesMap[m.from]!.add(m.to);
    }

    return { boardMap: map, checkSquare: chkSquare, legalMovesMap: movesMap };
  }, [fen, game]);

  // Active square is either dragged or selected
  const activeSquare = dragState?.square || selectedSquare;
  const legalTargets = (activeSquare && legalMovesMap[activeSquare]) || EMPTY_SET;

  // Clear selection if fen changed or game is not interactive
  useEffect(() => {
    if (!isInteractive) {
      setSelectedSquare(null);
      setDragState(null);
    }
  }, [fen, isInteractive]);

  // Execute a move attempt instantly
  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const piece = boardMap[from];
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      onMove(from, to, isPromotion ? 'q' : undefined);
      setSelectedSquare(null);
      setDragState(null);
    },
    [boardMap, onMove]
  );

  // Handle pointer down on a square (instant selection + fast drag prep)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, square: Square) => {
    if (!isInteractive || e.button !== 0) return;

    const piece = boardMap[square];

    // If already selected, check if user tapped a legal destination square
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      if (legalTargets.has(square)) {
        tryMove(selectedSquare, square);
        return;
      }
    }

    // If tapping on current player's piece, select it immediately
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);

      const targetEl = e.currentTarget;
      const rect = targetEl.getBoundingClientRect();

      dragStartRef.current = {
        square,
        piece,
        startX: e.clientX,
        startY: e.clientY,
        size: rect.width,
        isDragging: false,
      };
    } else {
      setSelectedSquare(null);
    }
  };

  // Window-level smooth pointer tracking for 120Hz high-refresh dragging
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;

      const { square, piece, startX, startY, size, isDragging } = dragStartRef.current;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);

      if (!isDragging && dist > 4) {
        dragStartRef.current.isDragging = true;
      }

      if (dragStartRef.current.isDragging) {
        setDragState({
          square,
          piece,
          x: e.clientX,
          y: e.clientY,
          size,
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const { square: fromSquare, isDragging } = dragStartRef.current;
      dragStartRef.current = null;

      if (isDragging && boardGridRef.current) {
        const rect = boardGridRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        if (relX >= 0 && relX < rect.width && relY >= 0 && relY < rect.height) {
          const col = Math.floor((relX / rect.width) * 8);
          const row = Math.floor((relY / rect.height) * 8);

          if (col >= 0 && col < 8 && row >= 0 && row < 8) {
            const targetFile = displayFiles[col];
            const targetRank = displayRanks[row];
            const targetSquare = `${targetFile}${targetRank}` as Square;

            const targets = legalMovesMap[fromSquare];
            if (targets && targets.has(targetSquare)) {
              tryMove(fromSquare, targetSquare);
              setDragState(null);
              return;
            } else if (targetSquare === fromSquare) {
              // Dropped on the same square: leave selected for click-to-move
              setDragState(null);
              return;
            }
          }
        }
        // Dropped on an illegal square or outside
        setSelectedSquare(null);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [displayFiles, displayRanks, legalMovesMap, tryMove]);

  return (
    <div
      className={`relative w-full max-w-[580px] aspect-square rounded-2xl p-2 sm:p-3 ${theme.boardBorder} bg-[#131b2e] select-none touch-none flex flex-col justify-center`}
    >
      <div
        ref={boardGridRef}
        className="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden shadow-inner select-none"
      >
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = boardMap[square];
            const isDark = (rankIdx + fileIdx) % 2 === 1;

            const isSelected = selectedSquare === square || dragState?.square === square;
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck = checkSquare === square;
            const isLegalTarget = legalTargets.has(square);
            const isCaptureTarget = isLegalTarget && piece !== undefined;
            const isBeingDragged = dragState?.square === square;

            return (
              <div
                key={square}
                onPointerDown={(e) => handlePointerDown(e, square)}
                className={`relative flex items-center justify-center cursor-pointer select-none ${
                  isDark ? theme.darkSquare : theme.lightSquare
                } ${isSelected ? theme.selectedSquare : ''} ${
                  isLastMove && !isSelected ? theme.lastMoveSquare : ''
                } ${isCheck ? theme.checkSquare : ''}`}
              >
                {/* Board Rank & File Labels on edges */}
                {fileIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-mono font-bold pointer-events-none select-none ${
                      isDark ? 'text-slate-300/60' : 'text-slate-700/60'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span
                    className={`absolute bottom-0 right-1 text-[10px] sm:text-xs font-mono font-bold pointer-events-none select-none ${
                      isDark ? 'text-slate-300/60' : 'text-slate-700/60'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Instant Legal Move Target Marker (clean dot) */}
                {isLegalTarget && !isCaptureTarget && (
                  <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/50 border border-white/70 pointer-events-none z-10 shadow-sm" />
                )}

                {/* Instant Legal Capture Target Ring */}
                {isCaptureTarget && (
                  <div className="absolute inset-1 rounded-full border-2 sm:border-[3px] border-amber-400/90 pointer-events-none z-10" />
                )}

                {/* Chess Piece on board */}
                {piece && (
                  <div
                    className={`w-[86%] h-[86%] flex items-center justify-center select-none ${
                      isBeingDragged ? 'opacity-25' : 'opacity-100'
                    } ${
                      isInteractive && piece.color === game.turn()
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer'
                    }`}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Dragged Piece: 120Hz GPU-accelerated translate3d under finger/cursor */}
      {dragState && (
        <div
          className="fixed pointer-events-none z-50 flex items-center justify-center select-none"
          style={{
            left: 0,
            top: 0,
            width: `${dragState.size * 0.95}px`,
            height: `${dragState.size * 0.95}px`,
            transform: `translate3d(${dragState.x - (dragState.size * 0.95) / 2}px, ${
              dragState.y - (dragState.size * 0.95) / 2
            }px, 0)`,
            willChange: 'transform',
          }}
        >
          <ChessPiece type={dragState.piece.type} color={dragState.piece.color} />
        </div>
      )}
    </div>
  );
};
