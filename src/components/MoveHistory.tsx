import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check } from 'lucide-react';
import { MoveRecord } from '../types/chess';

interface MoveHistoryProps {
  moves: MoveRecord[];
  currentMoveIndex: number; // -1 = start of game, moves.length - 1 = latest
  onSelectMove: (index: number) => void;
  onCopyPgn: () => void;
  onCopyFen: () => void;
  isCopiedPgn: boolean;
  isCopiedFen: boolean;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  onCopyPgn,
  onCopyFen,
  isCopiedPgn,
  isCopiedFen,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs: [whiteMove, blackMove?]
  const movePairs: Array<{ number: number; white: MoveRecord; black?: MoveRecord; whiteIdx: number; blackIdx?: number }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIdx: i,
      blackIdx: i + 1 < moves.length ? i + 1 : undefined,
    });
  }

  // Auto scroll to bottom when new move made
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  return (
    <div className="flex flex-col h-full bg-[#111726]/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/80 border-b border-slate-800/80">
        <span className="text-xs font-semibold text-slate-300">Move History</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCopyFen}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
            title="Copy FEN to clipboard"
          >
            {isCopiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>FEN</span>
          </button>
          <button
            onClick={onCopyPgn}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
            title="Copy PGN to clipboard"
          >
            {isCopiedPgn ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>PGN</span>
          </button>
        </div>
      </div>

      {/* Move list table */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs max-h-[220px] sm:max-h-[260px]">
        {movePairs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-slate-500 text-xs italic">
            Moves will appear here
          </div>
        ) : (
          movePairs.map((pair) => {
            const isWhiteActive = currentMoveIndex === pair.whiteIdx;
            const isBlackActive = pair.blackIdx !== undefined && currentMoveIndex === pair.blackIdx;

            return (
              <div
                key={pair.number}
                className="grid grid-cols-[36px_1fr_1fr] items-center py-1 px-1.5 rounded hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-slate-500 select-none text-[11px]">{pair.number}.</span>

                {/* White move */}
                <button
                  onClick={() => onSelectMove(pair.whiteIdx)}
                  className={`text-left px-2 py-0.5 rounded transition-all truncate ${
                    isWhiteActive
                      ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {pair.white.san}
                </button>

                {/* Black move */}
                {pair.black && pair.blackIdx !== undefined ? (
                  <button
                    onClick={() => onSelectMove(pair.blackIdx!)}
                    className={`text-left px-2 py-0.5 rounded transition-all truncate ${
                      isBlackActive
                        ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {pair.black.san}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Navigation buttons: <<, <, >, >> */}
      <div className="flex items-center justify-center gap-1 p-2 bg-slate-900/60 border-t border-slate-800/80">
        <button
          onClick={() => onSelectMove(-1)}
          disabled={currentMoveIndex === -1 || moves.length === 0}
          className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
          title="Start of game"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex === -1 || moves.length === 0}
          className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
          title="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
          className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
          title="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
          className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
          title="Current position"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
