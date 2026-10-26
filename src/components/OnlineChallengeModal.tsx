import React, { useState } from 'react';
import { Copy, Check, Users, Clock, Share2, Globe, Shield, ArrowRight, X, WifiOff, Swords } from 'lucide-react';
import { TIME_CONTROLS } from '../data/themes';
import { TimeControl } from '../types/chess';

interface OnlineChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (preferredColor: 'w' | 'b' | 'random', timeControl: TimeControl, playerName: string) => Promise<string>;
  onJoinRoom: (roomId: string, playerName: string) => void;
  currentRoomId: string | null;
  isWaitingForOpponent: boolean;
  initialPlayerName: string;
  isOnline?: boolean;
  onSelectOfflineBot?: () => void;
  onSelectTwoFriends?: () => void;
}

export const OnlineChallengeModal: React.FC<OnlineChallengeModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  currentRoomId,
  isWaitingForOpponent,
  initialPlayerName,
  isOnline = true,
  onSelectOfflineBot,
  onSelectTwoFriends,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('random');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[1]); // 10 min rapid default
  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const challengeUrl = currentRoomId
    ? `${window.location.origin}?game=${currentRoomId}`
    : '';

  const handleCopyLink = async () => {
    if (!challengeUrl) return;
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = challengeUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateRoom(preferredColor, selectedTimeControl, playerName);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = () => {
    if (!inputRoomId.trim()) return;
    // Extract room id if user pasted a full URL
    let cleanId = inputRoomId.trim();
    if (cleanId.includes('game=')) {
      cleanId = cleanId.split('game=')[1].split('&')[0];
    } else if (cleanId.includes('/')) {
      cleanId = cleanId.split('/').pop() || cleanId;
    }
    onJoinRoom(cleanId, playerName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#111726] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Play Online with Friend</h2>
            <p className="text-xs text-slate-400">Send an instant challenge link to play in real-time</p>
          </div>
        </div>

        {/* Offline Warning Notice */}
        {!isOnline && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You are currently playing offline</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Multiplayer challenge links require an active internet connection. You can play right now without internet against the <strong className="text-white">Single Hard Grandmaster Bot</strong> or in <strong className="text-white">Pass & Play</strong> mode!
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {onSelectTwoFriends && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTwoFriends();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Two Friends (Pass & Play)</span>
                </button>
              )}

              {onSelectOfflineBot && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectOfflineBot();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Play Hard GM Bot</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Room Waiting Screen */}
        {currentRoomId && isWaitingForOpponent ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
              <div className="relative flex items-center justify-center py-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Share2 className="w-6 h-6" />
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-white">Waiting for Friend to Join...</div>
                <p className="text-xs text-slate-400 mt-1">
                  Share this link with your friend. The game will automatically begin once they open it!
                </p>
              </div>

              {/* Challenge Link Input Box */}
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={challengeUrl}
                  className="flex-1 bg-transparent text-xs text-slate-300 font-mono px-2 outline-none select-all truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Room Code: <span className="font-bold text-slate-300 uppercase tracking-widest">{currentRoomId}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close & Wait in Game
            </button>
          </div>
        ) : (
          /* Create / Join Setup Tabs */
          <div className="space-y-4">
            {/* Tab navigation */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
              <button
                onClick={() => setMode('create')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Challenge
              </button>
              <button
                onClick={() => setMode('join')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'join'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Join by Code / URL
              </button>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Your Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="e.g. Grandmaster"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {mode === 'create' ? (
              <>
                {/* Choose Color */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Your Starting Color
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreferredColor('w')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        preferredColor === 'w'
                          ? 'bg-slate-800 border-amber-400 text-white ring-1 ring-amber-400'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-400" />
                      <span>White</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreferredColor('random')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        preferredColor === 'random'
                          ? 'bg-slate-800 border-amber-400 text-white ring-1 ring-amber-400'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-slate-100 to-zinc-900 border border-slate-400" />
                      <span>Random</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreferredColor('b')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        preferredColor === 'b'
                          ? 'bg-slate-800 border-amber-400 text-white ring-1 ring-amber-400'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-600" />
                      <span>Black</span>
                    </button>
                  </div>
                </div>

                {/* Choose Time Control */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Time Control
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_CONTROLS.map((tc) => (
                      <button
                        key={tc.label}
                        type="button"
                        onClick={() => setSelectedTimeControl(tc)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selectedTimeControl.label === tc.label
                            ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{tc.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {tc.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Create Button */}
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !isOnline}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {!isOnline
                      ? 'Offline — Connect to create challenge'
                      : isCreating
                      ? 'Creating Challenge...'
                      : 'Generate Challenge Link'}
                  </span>
                </button>
              </>
            ) : (
              /* Join Section */
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Room Code or Full Challenge Link
                  </label>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="e.g. gm-8x3k9 or https://..."
                    disabled={!isOnline}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <button
                  onClick={handleJoin}
                  disabled={!inputRoomId.trim() || !isOnline}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>{!isOnline ? 'Offline — Internet needed' : 'Connect & Join Match'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
