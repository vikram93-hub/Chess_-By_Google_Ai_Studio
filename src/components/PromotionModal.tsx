import React from 'react';
import { PieceSymbol, PlayerColor } from '../types/chess';
import { ChessPiece } from '../utils/chessPieces';

interface PromotionModalProps {
  isOpen: boolean;
  color: PlayerColor;
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES: Array<{ type: PieceSymbol; label: string }> = [
  { type: 'q', label: 'Queen' },
  { type: 'n', label: 'Knight' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
];

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  onSelect,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xs bg-[#111726] border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-center space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Pawn Promotion</h3>
        <p className="text-xs text-slate-400">Choose your promoted piece</p>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {PROMOTION_PIECES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
            >
              <div className="w-10 h-10 filter drop-shadow">
                <ChessPiece type={type} color={color} />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-amber-300 mt-1">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors pt-2 cursor-pointer"
        >
          Cancel move
        </button>
      </div>
    </div>
  );
};
