import React from 'react';
import { WifiOff, Wifi, CloudOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  wasOffline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, wasOffline }) => {
  if (isOnline && !wasOffline) {
    return null;
  }

  if (isOnline && wasOffline) {
    return (
      <aside
        aria-label="Reconnected notification"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in text-xs font-medium"
      >
        <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span>Connected — Online challenge rooms available</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Offline status banner"
      className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-md z-50 flex items-start gap-3 p-3 bg-slate-900/95 border border-amber-500/40 text-slate-200 rounded-xl shadow-2xl backdrop-blur-md text-xs"
    >
      <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400 shrink-0 mt-0.5">
        <WifiOff className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
            <CloudOff className="w-3.5 h-3.5" />
            Offline Mode Active
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider">
            100% Playable
          </span>
        </div>
        <p className="mt-1 text-slate-400 leading-relaxed text-[11px]">
          No internet required. The Grandmaster AI bot search engine, sound synthesizer, and local 2-player pass mode run completely on your device.
        </p>
      </div>
    </aside>
  );
};
