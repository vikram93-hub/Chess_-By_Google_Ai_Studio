import React from 'react';
import { Trophy, RotateCcw, Eye, ArrowRight, ShieldAlert } from 'lucide-react';
import { PlayerColor } from '../types/chess';

interface GameOverModalProps {
  isOpen: boolean;
  winner: 'w' | 'b' | 'draw' | null;
  winReason?: string;
  playerColor?: PlayerColor;
  movesCount: number;
  gameMode?: string;
  whitePlayerName?: string;
  blackPlayerName?: string;
  onRematch: () => void;
  onNewGame: () => void;
  onReviewBoard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  winReason,
  playerColor = 'w',
  movesCount,
  gameMode,
  whitePlayerName = 'White',
  blackPlayerName = 'Black',
  onRematch,
  onNewGame,
  onReviewBoard,
}) => {
  if (!isOpen) return null;

  const isDraw = winner === 'draw';
  const isLocal = gameMode === 'local';
  const isVictory = !isDraw && (isLocal || winner === playerColor);

  let title = 'Defeat';
  if (isDraw) {
    title = 'Game Drawn';
  } else if (isLocal) {
    title = winner === 'w' ? `${whitePlayerName} Wins!` : `${blackPlayerName} Wins!`;
  } else if (winner === playerColor) {
    title = 'Victory!';
  }

  const victorLabel = isDraw
    ? 'Peaceful Draw'
    : isLocal
    ? winner === 'w'
      ? `${whitePlayerName} (White)`
      : `${blackPlayerName} (Black)`
    : winner === 'w'
    ? 'White'
    : 'Black';

  const subtitle =
    winReason ||
    (isDraw
      ? 'Stalemate or draw agreement'
      : isLocal
      ? `Checkmate by ${winner === 'w' ? whitePlayerName : blackPlayerName}`
      : `${winner === 'w' ? 'White' : 'Black'} won the game`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#111726] border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-center space-y-5">
        {/* Outcome Icon badge */}
        <div className="flex justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg ${
              isDraw
                ? 'bg-slate-800 border-slate-600 text-slate-300'
                : isVictory
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}
          >
            {isDraw ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <Trophy className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Text Heading */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">Total Moves</div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">{movesCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Victor</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {victorLabel}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onRematch}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch / Play Again</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReviewBoard}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Review Board</span>
            </button>

            <button
              onClick={onNewGame}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <span>Main Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
