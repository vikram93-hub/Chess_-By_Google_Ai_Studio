import React from 'react';
import { Clock } from 'lucide-react';

interface ClockTimerProps {
  timeMs: number;
  isActive: boolean;
  hasClock: boolean;
  playerName: string;
  isBot?: boolean;
  color: 'w' | 'b';
  thinking?: boolean;
}

export const ClockTimer: React.FC<ClockTimerProps> = ({
  timeMs,
  isActive,
  hasClock,
  playerName,
  isBot = false,
  color,
  thinking = false,
}) => {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isLowTime = hasClock && totalSeconds <= 30;

  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
        isActive
          ? 'bg-slate-800/90 border border-slate-600/80 shadow-md ring-1 ring-amber-400/40'
          : 'bg-slate-900/50 border border-slate-800/50 opacity-80'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Piece color marker */}
        <div
          className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
            color === 'w'
              ? 'bg-slate-100 border-slate-400'
              : 'bg-zinc-900 border-zinc-500'
          }`}
        />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-bold text-slate-100 truncate">{playerName}</span>
            {isBot && (
              <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1 rounded uppercase tracking-wider shrink-0">
                Hard AI
              </span>
            )}
          </div>

          {thinking && (
            <span className="text-[10px] font-mono text-amber-400 animate-pulse">
              Calculating variations...
            </span>
          )}
        </div>
      </div>

      {hasClock ? (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-sm tracking-wider shrink-0 ${
            isLowTime
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : isActive
              ? 'bg-slate-950/80 text-amber-300 border border-amber-400/30'
              : 'bg-slate-950/40 text-slate-400 border border-slate-800'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-400' : 'text-slate-400'}`} />
          <span>{formatted}</span>
        </div>
      ) : (
        isActive && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-bold text-amber-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>To Move</span>
          </div>
        )
      )}
    </div>
  );
};
