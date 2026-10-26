import React from 'react';

interface EvaluationBarProps {
  score: number; // centipawns (>0 White advantage, <0 Black advantage)
  scoreDisplay?: string;
  isFlipped?: boolean; // if playing as black
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  score,
  scoreDisplay,
  isFlipped = false,
}) => {
  // Clamp score between -1000 and +1000 for visual percentage (10 pawn advantage = 100%)
  const clamped = Math.max(-1000, Math.min(1000, score));
  // Map -1000..1000 to 5%..95%
  const whitePercent = 50 + (clamped / 1000) * 45;
  const displayPercent = isFlipped ? 100 - whitePercent : whitePercent;

  return (
    <div className="relative flex flex-col items-center justify-between w-6 sm:w-7 h-full min-h-[340px] max-h-[580px] bg-[#18181b] rounded-lg overflow-hidden border border-slate-700/60 shadow-md">
      {/* Black portion on top (or bottom if flipped) */}
      <div
        className="w-full bg-[#1e2330] transition-all duration-300 ease-out"
        style={{ height: `${100 - displayPercent}%` }}
      />

      {/* White portion */}
      <div
        className="w-full bg-[#e2e8f0] transition-all duration-300 ease-out border-t border-slate-400/30"
        style={{ height: `${displayPercent}%` }}
      />

      {/* Score label overlay */}
      <div
        className={`absolute inset-x-0 py-1 text-center font-mono font-bold text-[10px] sm:text-[11px] pointer-events-none select-none ${
          whitePercent > 50 ? 'bottom-1 text-slate-900' : 'top-1 text-slate-200'
        }`}
      >
        {scoreDisplay || (score === 0 ? '0.0' : score > 0 ? `+${(score / 100).toFixed(1)}` : (score / 100).toFixed(1))}
      </div>
    </div>
  );
};
