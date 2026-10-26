import React, { useState } from 'react';
import { Download, Check, Share, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Check if iOS device
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isInstalled) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium"
        title="App installed for offline play"
      >
        <Check className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline Ready</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await installApp();
      if (res) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instructions for desktop or browsers that don't trigger prompt yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Install app for offline play"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/45 hover:to-indigo-600/45 border border-cyan-500/30 text-cyan-200 text-xs font-semibold tracking-wide shadow-sm hover:shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
      >
        {installSuccess ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Installed!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Install Offline</span>
          </>
        )}
      </button>

      {/* Manual install guide dialog for iOS / browsers without beforeinstallprompt */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-200">
            <button
              onClick={() => setShowIOSModal(false)}
              aria-label="Close offline instructions"
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 id="offline-install-title" className="font-bold text-sm text-slate-100">
                  Play Anywhere Offline
                </h3>
                <p className="text-[11px] text-slate-400">Install as an independent app</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Grandmaster Dark Chess stores all chess rules, GM tactical bots, sounds, and themes right on your device. Once installed, you can play anytime without an internet connection or cellular data!
            </p>

            <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
              {isIOS ? (
                <>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold text-[11px]">1</span>
                    <span>Tap the Safari <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> Share button below</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold text-[11px]">2</span>
                    <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold text-[11px]">1</span>
                    <span>Click the browser address bar icon or menu (<span className="font-mono">...</span>)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold text-[11px]">2</span>
                    <span>Select <strong className="text-white">Install Grandmaster Dark Chess</strong></span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
