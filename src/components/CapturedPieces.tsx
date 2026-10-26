import React from 'react';
import { PieceSymbol, PlayerColor } from '../types/chess';
import { ChessPiece } from '../utils/chessPieces';

interface CapturedPiecesProps {
  captured: PieceSymbol[];
  capturingColor: PlayerColor;
  advantage?: number; // centipawns or piece delta
}

const PIECE_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  captured,
  capturingColor,
  advantage,
}) => {
  // Sort pieces by value
  const sortedPieces = [...captured].sort(
    (a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b)
  );

  // The piece appearance color is the OPPOSITE of capturingColor (since White captures Black pieces)
  const pieceColor: PlayerColor = capturingColor === 'w' ? 'b' : 'w';

  return (
    <div className="flex items-center gap-1.5 min-h-[28px] overflow-hidden">
      <div className="flex items-center -space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        {sortedPieces.map((p, idx) => (
          <div key={`${p}-${idx}`} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 filter drop-shadow">
            <ChessPiece type={p} color={pieceColor} />
          </div>
        ))}
      </div>

      {advantage !== undefined && advantage > 0 && (
        <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">
          +{advantage}
        </span>
      )}
    </div>
  );
};
