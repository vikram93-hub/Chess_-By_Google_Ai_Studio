import React from 'react';
import { Palette, X, Check } from 'lucide-react';
import { THEMES } from '../data/themes';
import { ThemeId, ChessTheme } from '../types/chess';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (theme: ChessTheme) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#111726] border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Board Theme</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Curated dark-mode tournament palettes designed for visual comfort and high contrast.
        </p>

        {/* Theme List */}
        <div className="space-y-2 pt-1">
          {Object.values(THEMES).map((theme) => {
            const isSelected = theme.id === currentThemeId;

            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-400/80 ring-1 ring-amber-400/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Miniature 2x2 board preview */}
                  <div className="w-8 h-8 rounded-md grid grid-cols-2 grid-rows-2 overflow-hidden border border-slate-700 shrink-0">
                    <div className={theme.lightSquare} />
                    <div className={theme.darkSquare} />
                    <div className={theme.darkSquare} />
                    <div className={theme.lightSquare} />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white">{theme.name}</div>
                    <div className="text-[10px] text-slate-400">{theme.subtitle}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
