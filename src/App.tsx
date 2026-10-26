import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, Move } from 'chess.js';
import {
  Swords,
  Globe,
  RotateCw,
  Volume2,
  VolumeX,
  Palette,
  Flag,
  Handshake,
  Share2,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Users,
  ArrowLeftRight,
} from 'lucide-react';
import {
  GameMode,
  PlayerColor,
  PieceSymbol,
  ChessTheme,
  BotMetrics,
  MoveRecord,
  CapturedPiecesState,
  TimeControl,
  OnlineRoomData,
} from './types/chess';
import { THEMES, TIME_CONTROLS } from './data/themes';
import { calculateHardBotMove, evaluateBoard } from './utils/chessAi';
import { soundEffects } from './utils/soundEffects';
import { multiplayerService } from './services/multiplayer';
import { ChessBoard } from './components/ChessBoard';
import { CapturedPieces } from './components/CapturedPieces';
import { ClockTimer } from './components/ClockTimer';
import { EvaluationBar } from './components/EvaluationBar';
import { MoveHistory } from './components/MoveHistory';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { OnlineChallengeModal } from './components/OnlineChallengeModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { OnlineChatDrawer } from './components/OnlineChatDrawer';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';

// Helper to calculate captured pieces and material score
function calculateCaptured(game: Chess): CapturedPiecesState {
  const initialCounts: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const currentWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === 'w') {
          currentWhite[piece.type as PieceSymbol]++;
        } else {
          currentBlack[piece.type as PieceSymbol]++;
        }
      }
    }
  }

  const pieceValues: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  let whiteMat = 0;
  let blackMat = 0;

  (Object.keys(initialCounts) as PieceSymbol[]).forEach((sym) => {
    // Pieces missing from Black were captured by White
    const blackLost = Math.max(0, initialCounts[sym] - currentBlack[sym]);
    for (let i = 0; i < blackLost; i++) capturedByWhite.push(sym);

    // Pieces missing from White were captured by Black
    const whiteLost = Math.max(0, initialCounts[sym] - currentWhite[sym]);
    for (let i = 0; i < whiteLost; i++) capturedByBlack.push(sym);

    whiteMat += currentWhite[sym] * pieceValues[sym];
    blackMat += currentBlack[sym] * pieceValues[sym];
  });

  return {
    capturedByWhite,
    capturedByBlack,
    whiteMaterial: whiteMat,
    blackMaterial: blackMat,
    materialAdvantage: whiteMat - blackMat,
  };
}

export function App() {
  // Network connectivity status for offline PWA awareness
  const { isOnline, wasOffline } = useOnlineStatus();

  // Game instance and board state
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [displayGame, setDisplayGame] = useState<Chess>(() => new Chess());
  const [mode, setMode] = useState<GameMode>('bot');
  const [theme, setTheme] = useState<ChessTheme>(THEMES.slate);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isMuted, setIsMuted] = useState(soundEffects.getIsMuted());

  // Two Friends (Pass & Play) mode states
  const [friend1Name, setFriend1Name] = useState('Friend 1');
  const [friend2Name, setFriend2Name] = useState('Friend 2');
  const [autoFlipBoard, setAutoFlipBoard] = useState(false);

  // Clocks and timing
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[1]);
  const [whiteTimeMs, setWhiteTimeMs] = useState(10 * 60 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState(10 * 60 * 1000);
  const [isClockRunning, setIsClockRunning] = useState(false);

  // Moves & History
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [capturedState, setCapturedState] = useState<CapturedPiecesState>({
    capturedByWhite: [],
    capturedByBlack: [],
    whiteMaterial: 39,
    blackMaterial: 39,
    materialAdvantage: 0,
  });

  // Bot Engine state
  const [botMetrics, setBotMetrics] = useState<BotMetrics>({
    depth: 3,
    nodes: 0,
    evaluationScore: 0,
    scoreDisplay: '0.0',
    thinkingTimeMs: 0,
    thinking: false,
  });

  // Game over state
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [gameOverResult, setGameOverResult] = useState<{
    winner: 'w' | 'b' | 'draw' | null;
    reason?: string;
  }>({ winner: null });
  const [isReviewingBoard, setIsReviewingBoard] = useState(false);

  // Promotion modal
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Online Multiplayer state
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomData | null>(null);
  const [isOnlineChallengeOpen, setIsOnlineChallengeOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [drawOfferedBy, setDrawOfferedBy] = useState<'w' | 'b' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);

  const clockIntervalRef = useRef<number | null>(null);
  const isBotThinkingRef = useRef(false);

  // Check URL on startup for challenge link: ?game=xyz
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('game');
    if (roomParam) {
      setMode('online');
      multiplayerService.connect(roomParam);
      setIsOnlineChallengeOpen(false);
    }
  }, []);

  // Sync orientation with player color unless manually toggled
  useEffect(() => {
    if (mode === 'bot') {
      setBoardOrientation(playerColor === 'w' ? 'white' : 'black');
    }
  }, [playerColor, mode]);

  // Handle game clock countdown in local / bot modes (untimed for bot)
  useEffect(() => {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);

    if (
      isClockRunning &&
      timeControl.baseMinutes > 0 &&
      !gameOverResult.winner &&
      mode !== 'online' &&
      mode !== 'bot'
    ) {
      const activeColor = game.turn();

      clockIntervalRef.current = window.setInterval(() => {
        const delta = 100;
        if (activeColor === 'w') {
          setWhiteTimeMs((prev) => {
            const next = Math.max(0, prev - delta);
            if (next <= 0) {
              handleGameOver('b', 'White flag fell (time out)');
            }
            return next;
          });
        } else {
          setBlackTimeMs((prev) => {
            const next = Math.max(0, prev - delta);
            if (next <= 0) {
              handleGameOver('w', 'Black flag fell (time out)');
            }
            return next;
          });
        }
      }, 100);
    }

    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [isClockRunning, game, timeControl, gameOverResult.winner, mode]);

  // Online multiplayer events setup
  useEffect(() => {
    multiplayerService.setEvents({
      onRoomUpdate: (room, yourColor) => {
        setOnlineRoom(room);
        if (yourColor !== 'spectator') {
          setPlayerColor(yourColor);
          setBoardOrientation(yourColor === 'w' ? 'white' : 'black');
        }

        const newGame = new Chess(room.fen);
        setGame(newGame);
        setDisplayGame(newGame);
        setWhiteTimeMs(room.whiteTimeMs);
        setBlackTimeMs(room.blackTimeMs);
        setCapturedState(calculateCaptured(newGame));

        if (room.moves.length > 0) {
          const lastH = room.history[room.history.length - 1];
          if (lastH) setLastMove({ from: lastH.from, to: lastH.to });
        }

        if (room.status === 'playing') {
          setIsClockRunning(true);
        } else if (room.status !== 'waiting') {
          setIsClockRunning(false);
          setGameOverResult({
            winner: room.winner,
            reason: room.winReason || 'Game completed',
          });
          setIsGameOverOpen(true);
          soundEffects.playGameOver(
            room.winner === 'draw' ? 'draw' : room.winner === yourColor ? 'victory' : 'defeat'
          );
        }
      },
      onMoveMade: (m, room) => {
        setOnlineRoom(room);
        const newGame = new Chess(room.fen);
        setGame(newGame);
        setDisplayGame(newGame);
        setLastMove({ from: m.from, to: m.to });
        setWhiteTimeMs(room.whiteTimeMs);
        setBlackTimeMs(room.blackTimeMs);
        setCapturedState(calculateCaptured(newGame));

        // Sound effect
        if (newGame.inCheck()) {
          soundEffects.playCheck();
        } else if (m.captured) {
          soundEffects.playCapture();
        } else if (m.san.includes('O-O')) {
          soundEffects.playCastle();
        } else {
          soundEffects.playMove();
        }

        // Add to move record
        setMoves((prev) => [
          ...prev,
          {
            from: m.from,
            to: m.to,
            san: m.san,
            piece: m.piece as PieceSymbol,
            color: m.color,
            captured: m.captured as PieceSymbol | undefined,
            fenAfter: room.fen,
            timestamp: Date.now(),
          },
        ]);
        setCurrentMoveIndex((prev) => prev + 1);
      },
      onGameOver: (room) => {
        setOnlineRoom(room);
        setIsClockRunning(false);
        setGameOverResult({
          winner: room.winner,
          reason: room.winReason,
        });
        setIsGameOverOpen(true);
        soundEffects.playGameOver(
          room.winner === 'draw'
            ? 'draw'
            : room.winner === multiplayerService.yourColor
            ? 'victory'
            : 'defeat'
        );
      },
      onDrawOffered: (from) => {
        setDrawOfferedBy(from);
        soundEffects.playNotify();
      },
      onDrawDeclined: () => {
        setDrawOfferedBy(null);
      },
      onRematchStarted: (room) => {
        setOnlineRoom(room);
        const newGame = new Chess();
        setGame(newGame);
        setDisplayGame(newGame);
        setMoves([]);
        setCurrentMoveIndex(-1);
        setLastMove(null);
        setGameOverResult({ winner: null });
        setIsGameOverOpen(false);
        setIsReviewingBoard(false);
        setWhiteTimeMs(room.whiteTimeMs);
        setBlackTimeMs(room.blackTimeMs);
        setIsClockRunning(true);
        setDrawOfferedBy(null);
        soundEffects.playNotify();
      },
      onError: (msg) => {
        console.warn('Multiplayer error:', msg);
      },
    });

    return () => {
      multiplayerService.setEvents({});
    };
  }, []);

  const handleGameOver = useCallback(
    (winner: 'w' | 'b' | 'draw', reason: string) => {
      setIsClockRunning(false);
      setGameOverResult({ winner, reason });
      setIsGameOverOpen(true);
      soundEffects.playGameOver(
        winner === 'draw' ? 'draw' : winner === playerColor ? 'victory' : 'defeat'
      );
    },
    [playerColor]
  );

  // Execute a validated move in the game
  const executeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (mode === 'online') {
        multiplayerService.sendMove(from, to, promotion);
        return;
      }

      try {
        const moveResult = game.move({ from, to, promotion: promotion || 'q' });
        if (!moveResult) return;

        const newFen = game.fen();
        const newGame = new Chess(newFen);
        setGame(newGame);
        setDisplayGame(newGame);
        setLastMove({ from, to });
        setIsClockRunning(true);

        // Sound effect
        if (newGame.inCheck()) {
          soundEffects.playCheck();
        } else if (moveResult.captured) {
          soundEffects.playCapture();
        } else if (moveResult.san.includes('O-O')) {
          soundEffects.playCastle();
        } else {
          soundEffects.playMove();
        }

        // Add move to history
        const newRecord: MoveRecord = {
          from,
          to,
          san: moveResult.san,
          piece: moveResult.piece as PieceSymbol,
          color: moveResult.color as PlayerColor,
          captured: moveResult.captured as PieceSymbol | undefined,
          fenAfter: newFen,
          timestamp: Date.now(),
        };

        setMoves((prev) => [...prev, newRecord]);
        setCurrentMoveIndex((prev) => prev + 1);

        // Add increment to clock if applicable (not for untimed bot)
        if (mode !== 'bot' && timeControl.incrementSeconds > 0) {
          const incMs = timeControl.incrementSeconds * 1000;
          if (moveResult.color === 'w') {
            setWhiteTimeMs((prev) => prev + incMs);
          } else {
            setBlackTimeMs((prev) => prev + incMs);
          }
        }

        // Update captured pieces & material evaluation
        setCapturedState(calculateCaptured(newGame));

        // Update evaluation bar for bot / local asynchronously
        setTimeout(() => {
          const evalScore = evaluateBoard(newGame);
          setBotMetrics((prev) => ({
            ...prev,
            evaluationScore: evalScore,
            scoreDisplay:
              evalScore === 0
                ? '0.0'
                : evalScore > 0
                ? `+${(evalScore / 100).toFixed(1)}`
                : (evalScore / 100).toFixed(1),
          }));
        }, 0);

        // Auto-flip board in Two Friends mode if enabled
        if (mode === 'local' && autoFlipBoard && !newGame.isGameOver()) {
          const nextTurn = newGame.turn();
          setBoardOrientation(nextTurn === 'w' ? 'white' : 'black');
        }

        // Check for Game Over conditions
        if (newGame.isGameOver()) {
          setIsClockRunning(false);
          if (newGame.isCheckmate()) {
            const winner = moveResult.color as PlayerColor;
            handleGameOver(
              winner,
              `Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins!`
            );
          } else if (newGame.isDraw()) {
            let reason = 'Draw by agreement';
            if (newGame.isStalemate()) reason = 'Draw by Stalemate';
            else if (newGame.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
            else if (newGame.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
            else if (newGame.isDrawByFiftyMoves()) reason = 'Draw by 50-move rule';
            handleGameOver('draw', reason);
          }
        }
      } catch (err) {
        console.error('Move error:', err);
      }
    },
    [game, mode, timeControl, autoFlipBoard, handleGameOver]
  );

  // Trigger AI move when it's the bot's turn
  useEffect(() => {
    if (mode !== 'bot') return;
    if (gameOverResult.winner) return;

    const botColor: PlayerColor = playerColor === 'w' ? 'b' : 'w';
    if (game.turn() === botColor && !isBotThinkingRef.current) {
      isBotThinkingRef.current = true;
      setBotMetrics((prev) => ({ ...prev, thinking: true }));

      // Brief 35ms micro-pause so user's piece drop visually settles instantly
      const timer = setTimeout(() => {
        calculateHardBotMove(game.fen())
          .then(({ move, metrics }) => {
            if (!move) return;
            executeMove(move.from, move.to, move.promotion);
            setBotMetrics(metrics);
          })
          .catch((err) => {
            console.error('Bot calculation error:', err);
          })
          .finally(() => {
            isBotThinkingRef.current = false;
            setBotMetrics((prev) => ({ ...prev, thinking: false }));
          });
      }, 35);

      return () => clearTimeout(timer);
    }
  }, [game, mode, playerColor, gameOverResult.winner, executeMove]);

  // User board move handler
  const handleUserMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    // If reviewing past move, snap back to latest position
    if (currentMoveIndex !== moves.length - 1) {
      setCurrentMoveIndex(moves.length - 1);
      setDisplayGame(game);
    }

    // Pawn promotion detection
    const piece = game.get(from);
    const isPawnPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPawnPromotion && !promotion) {
      setPendingPromotion({ from, to });
      return;
    }

    executeMove(from, to, promotion);
  };

  // Promotion choice selection
  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  };

  // Reset / New game
  const handleResetGame = (newMode?: GameMode, newColor?: PlayerColor) => {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    const freshGame = new Chess();
    setGame(freshGame);
    setDisplayGame(freshGame);
    setMoves([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setGameOverResult({ winner: null });
    setIsGameOverOpen(false);
    setIsReviewingBoard(false);
    setPendingPromotion(null);
    setDrawOfferedBy(null);

    const baseMs = timeControl.baseMinutes > 0 ? timeControl.baseMinutes * 60 * 1000 : 0;
    setWhiteTimeMs(baseMs);
    setBlackTimeMs(baseMs);
    setIsClockRunning(false);
    setCapturedState(calculateCaptured(freshGame));
    setBotMetrics({
      depth: 3,
      nodes: 0,
      evaluationScore: 0,
      scoreDisplay: '0.0',
      thinkingTimeMs: 0,
      thinking: false,
    });

    if (newMode) {
      setMode(newMode);
      if (newMode === 'local') {
        setBoardOrientation('white');
      }
    }
    if (newColor) setPlayerColor(newColor);
  };

  // Move history review selection
  const handleSelectHistoryMove = (index: number) => {
    setCurrentMoveIndex(index);
    if (index === -1) {
      setDisplayGame(new Chess());
      setLastMove(null);
    } else {
      const targetFen = moves[index].fenAfter;
      setDisplayGame(new Chess(targetFen));
      setLastMove({ from: moves[index].from, to: moves[index].to });
    }
  };

  // Online room creation
  const handleCreateOnlineRoom = async (
    preferredColor: 'w' | 'b' | 'random',
    tc: TimeControl,
    name: string
  ): Promise<string> => {
    setTimeControl(tc);
    multiplayerService.setPlayerName(name);

    if (!isOnline) {
      throw new Error('Internet connection required for online challenge rooms. Try Hard Bot sparring instead!');
    }

    const assignedColor: 'w' | 'b' =
      preferredColor === 'random'
        ? Math.random() > 0.5
          ? 'w'
          : 'b'
        : preferredColor;

    setPlayerColor(assignedColor);

    // Request new room from server with fallback
    let roomId = '';
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeControl: tc }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.roomId) {
          roomId = data.roomId;
        }
      }
    } catch {
      // Fallback
    }

    if (!roomId) {
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Connect to room over WebSocket
    multiplayerService.connect(roomId, assignedColor, {
      baseMinutes: tc.baseMinutes,
      incrementSeconds: tc.incrementSeconds,
    });

    setMode('online');
    return roomId;
  };

  // Online room joining
  const handleJoinOnlineRoom = (roomId: string, name: string) => {
    multiplayerService.setPlayerName(name);
    multiplayerService.connect(roomId);
    setMode('online');
    setIsOnlineChallengeOpen(false);
  };

  // Copy helpers
  const handleCopyChallenge = async () => {
    if (!onlineRoom) return;
    const url = `${window.location.origin}?game=${onlineRoom.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(game.pgn() || '1. e4');
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyFen = async () => {
    try {
      await navigator.clipboard.writeText(game.fen());
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } catch {
      // ignore
    }
  };

  // Is current board interactive for the user?
  const isInteractive =
    !gameOverResult.winner &&
    currentMoveIndex === moves.length - 1 &&
    (mode === 'local' ||
      (mode === 'bot' && game.turn() === playerColor) ||
      (mode === 'online' &&
        onlineRoom?.status === 'playing' &&
        game.turn() === multiplayerService.yourColor));

  // Determine top and bottom players based on board orientation
  const isBottomWhite = boardOrientation === 'white';
  const bottomColor: PlayerColor = isBottomWhite ? 'w' : 'b';
  const topColor: PlayerColor = isBottomWhite ? 'b' : 'w';

  const bottomTime = isBottomWhite ? whiteTimeMs : blackTimeMs;
  const topTime = isBottomWhite ? blackTimeMs : whiteTimeMs;

  const bottomName =
    mode === 'online'
      ? isBottomWhite
        ? onlineRoom?.white?.name || 'White'
        : onlineRoom?.black?.name || 'Black'
      : mode === 'local'
      ? isBottomWhite
        ? `${friend1Name} (White)`
        : `${friend2Name} (Black)`
      : isBottomWhite
      ? playerColor === 'w'
        ? multiplayerService.getPlayerName()
        : 'Grandmaster Bot'
      : playerColor === 'b'
      ? multiplayerService.getPlayerName()
      : 'Grandmaster Bot';

  const topName =
    mode === 'online'
      ? isBottomWhite
        ? onlineRoom?.black?.name || 'Waiting for Friend...'
        : onlineRoom?.white?.name || 'Waiting for Friend...'
      : mode === 'local'
      ? isBottomWhite
        ? `${friend2Name} (Black)`
        : `${friend1Name} (White)`
      : isBottomWhite
      ? playerColor === 'b'
        ? multiplayerService.getPlayerName()
        : 'Grandmaster Bot'
      : playerColor === 'w'
      ? multiplayerService.getPlayerName()
      : 'Grandmaster Bot';

  const isTopBot = mode === 'bot' && topColor !== playerColor;
  const isBottomBot = mode === 'bot' && bottomColor !== playerColor;

  return (
    <div className={`min-h-screen ${theme.canvasBg} text-slate-100 flex flex-col transition-colors duration-300 font-sans`}>
      {/* 1. Universal Top Bar Contract: 3 Zones */}
      <header className="flex items-center justify-between gap-6 px-4 sm:px-8 py-3.5 bg-[#090d16]/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single Brand Wordmark in display face */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Swords className="w-4 h-4" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white">
            Grandmaster Dark Chess
          </span>
        </div>

        {/* Zone 2: Navigation Links & Active Mode Indicator */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400 whitespace-nowrap">
          <button
            onClick={() => handleResetGame('bot')}
            className={`transition-colors cursor-pointer ${
              mode === 'bot' ? 'text-amber-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Hard Bot Sparring
          </button>
          <button
            onClick={() => handleResetGame('local')}
            className={`transition-colors cursor-pointer ${
              mode === 'local' ? 'text-emerald-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Two Friends (2-Player)
          </button>
          <button
            onClick={() => setIsOnlineChallengeOpen(true)}
            className={`transition-colors cursor-pointer ${
              mode === 'online' ? 'text-indigo-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Play Online with Friend
          </button>
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Themes
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action CTA Button + Install & Audio */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />

          {mode === 'online' && onlineRoom ? (
            <button
              onClick={handleCopyChallenge}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Copy challenge link to invite friend"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Challenge'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOnlineChallengeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Invite Friend</span>
            </button>
          )}

          <button
            onClick={() => setIsMuted(soundEffects.toggleMute())}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Draw offer notification banner if opponent offered a draw */}
      {drawOfferedBy && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <span>Opponent has offered a draw. Do you accept?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => multiplayerService.respondDraw(true)}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
            >
              Accept Draw
            </button>
            <button
              onClick={() => multiplayerService.respondDraw(false)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Main Chess Arena */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[auto_1fr_360px] gap-4 sm:gap-6 items-start justify-center">
        {/* Left: Dynamic Evaluation Engine Bar */}
        <div className="hidden lg:flex flex-col items-center h-full max-h-[580px] self-center">
          <EvaluationBar
            score={botMetrics.evaluationScore}
            scoreDisplay={botMetrics.scoreDisplay}
            isFlipped={boardOrientation === 'black'}
          />
        </div>

        {/* Center: Chessboard with Top & Bottom Player Info Trays */}
        <div className="flex flex-col items-center w-full max-w-[580px] mx-auto space-y-2">
          {/* Top Player (Opponent / Bot) HUD */}
          <div className="w-full flex items-center justify-between px-1">
            <div className="flex-1 mr-2">
              <ClockTimer
                timeMs={topTime}
                isActive={game.turn() === topColor && (mode === 'bot' || isClockRunning)}
                hasClock={mode !== 'bot' && timeControl.baseMinutes > 0}
                playerName={topName}
                isBot={isTopBot}
                color={topColor}
                thinking={isTopBot && botMetrics.thinking}
              />
            </div>
            <CapturedPieces
              captured={
                topColor === 'w'
                  ? capturedState.capturedByWhite
                  : capturedState.capturedByBlack
              }
              capturingColor={topColor}
              advantage={
                topColor === 'w'
                  ? Math.max(0, capturedState.materialAdvantage)
                  : Math.max(0, -capturedState.materialAdvantage)
              }
            />
          </div>

          {/* Interactive 60FPS Chessboard */}
          <ChessBoard
            game={displayGame}
            theme={theme}
            orientation={boardOrientation}
            lastMove={lastMove}
            isInteractive={isInteractive}
            onMove={handleUserMove}
          />

          {/* Bottom Player (You) HUD */}
          <div className="w-full flex items-center justify-between px-1">
            <div className="flex-1 mr-2">
              <ClockTimer
                timeMs={bottomTime}
                isActive={game.turn() === bottomColor && (mode === 'bot' || isClockRunning)}
                hasClock={mode !== 'bot' && timeControl.baseMinutes > 0}
                playerName={bottomName}
                isBot={isBottomBot}
                color={bottomColor}
                thinking={isBottomBot && botMetrics.thinking}
              />
            </div>
            <CapturedPieces
              captured={
                bottomColor === 'w'
                  ? capturedState.capturedByWhite
                  : capturedState.capturedByBlack
              }
              capturingColor={bottomColor}
              advantage={
                bottomColor === 'w'
                  ? Math.max(0, capturedState.materialAdvantage)
                  : Math.max(0, -capturedState.materialAdvantage)
              }
            />
          </div>

          {/* Quick Action Bar under Board */}
          <div className="w-full flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                title="Flip board orientation"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                onClick={() => setIsThemeModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                title="Select dark theme"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Theme</span>
              </button>

              <button
                onClick={() => handleResetGame()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                title="Reset position"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {mode === 'online' && onlineRoom?.status === 'playing' && (
                <>
                  <button
                    onClick={() => multiplayerService.offerDraw()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                    title="Offer peaceful draw"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span>Draw</span>
                  </button>

                  <button
                    onClick={() => multiplayerService.resign()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-xs text-rose-300 transition-colors cursor-pointer"
                    title="Resign current match"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign</span>
                  </button>
                </>
              )}

              {mode === 'local' && !gameOverResult.winner && (
                <>
                  <button
                    onClick={() => handleGameOver('draw', 'Draw agreed mutually by both friends')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                    title="Both friends agree to peaceful draw"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span>Draw</span>
                  </button>

                  <button
                    onClick={() =>
                      handleGameOver(
                        game.turn() === 'w' ? 'b' : 'w',
                        `${game.turn() === 'w' ? friend1Name : friend2Name} resigned`
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-xs text-rose-300 transition-colors cursor-pointer"
                    title={`Resign for active player (${game.turn() === 'w' ? friend1Name : friend2Name})`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign</span>
                  </button>
                </>
              )}

              {mode === 'bot' && !gameOverResult.winner && (
                <button
                  onClick={() => handleGameOver(playerColor === 'w' ? 'b' : 'w', 'Resignation')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                  title="Resign against bot"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Resign</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Match Control, Engine Analytics, Move History, and Live Chat */}
        <div className="flex flex-col gap-3 w-full">
          {/* Mode Switch Card */}
          <div className="p-3 rounded-xl bg-[#111726]/90 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Game Mode</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                mode === 'bot'
                  ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                  : mode === 'local'
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
              }`}>
                {mode === 'bot' ? 'Hard Bot AI' : mode === 'local' ? 'Two Friends (2P)' : 'Online Room'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleResetGame('bot')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  mode === 'bot'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
                title="Play offline against hard minimax chess engine"
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <span className="text-[11px] leading-tight">Hard Bot</span>
              </button>

              <button
                onClick={() => handleResetGame('local')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  mode === 'local'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
                title="Two friends play on the same device (pass and play)"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="text-[11px] leading-tight">Two Friends</span>
              </button>

              <button
                onClick={() => setIsOnlineChallengeOpen(true)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  mode === 'online'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
                title="Create or join an online challenge room"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="text-[11px] leading-tight">Play Online</span>
              </button>
            </div>
          </div>

          {/* Dedicated Two Friends (Pass & Play) Match Control Card */}
          {mode === 'local' && (
            <div className="p-3.5 rounded-xl bg-[#111726]/90 border border-slate-800/80 shadow-md space-y-3">
              {/* Header with active turn badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Two Friends (Same Screen)</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${
                  game.turn() === 'w'
                    ? 'bg-slate-100 text-slate-950 border-slate-300'
                    : 'bg-zinc-900 text-amber-300 border-zinc-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${game.turn() === 'w' ? 'bg-amber-500' : 'bg-emerald-400'} animate-ping`} />
                  <span>{game.turn() === 'w' ? `${friend1Name}'s Turn (White)` : `${friend2Name}'s Turn (Black)`}</span>
                </div>
              </div>

              {/* Player Name Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-400 shrink-0" />
                    <span>White</span>
                  </div>
                  <input
                    type="text"
                    value={friend1Name}
                    onChange={(e) => setFriend1Name(e.target.value.slice(0, 16))}
                    placeholder="Friend 1"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>

                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-500 shrink-0" />
                    <span>Black</span>
                  </div>
                  <input
                    type="text"
                    value={friend2Name}
                    onChange={(e) => setFriend2Name(e.target.value.slice(0, 16))}
                    placeholder="Friend 2"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>
              </div>

              {/* Auto-flip switch */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Auto-Flip Board</span>
                  <span className="text-[10px] text-slate-500">Rotate board 180° on every move</span>
                </div>
                <button
                  onClick={() => {
                    const next = !autoFlipBoard;
                    setAutoFlipBoard(next);
                    if (next) {
                      setBoardOrientation(game.turn() === 'w' ? 'white' : 'black');
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    autoFlipBoard
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {autoFlipBoard ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Time Control selection */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Match Timer</span>
                  <span className="text-amber-400 font-bold">{timeControl.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {TIME_CONTROLS.map((tc) => (
                    <button
                      key={tc.label}
                      onClick={() => {
                        setTimeControl(tc);
                        const ms = tc.baseMinutes > 0 ? tc.baseMinutes * 60 * 1000 : 0;
                        setWhiteTimeMs(ms);
                        setBlackTimeMs(ms);
                      }}
                      className={`py-1 px-1 rounded text-[10px] font-bold text-center transition-colors cursor-pointer ${
                        timeControl.label === tc.label
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400 border border-slate-800/80 hover:bg-slate-800'
                      }`}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions for Friends */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => {
                    const temp = friend1Name;
                    setFriend1Name(friend2Name);
                    setFriend2Name(temp);
                    handleResetGame('local');
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition-colors cursor-pointer"
                  title="Swap White and Black colors between friends"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Swap Colors</span>
                </button>

                <button
                  onClick={() => handleGameOver('draw', 'Draw agreed mutually by both friends')}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition-colors cursor-pointer"
                  title="Both friends agree to draw"
                >
                  <Handshake className="w-3 h-3" />
                  <span>Agree Draw</span>
                </button>
              </div>
            </div>
          )}

          {/* Bot Metrics & Sparring Settings Card (shown during Bot mode) */}
          {mode === 'bot' && (
            <div className="p-3.5 rounded-xl bg-[#111726]/90 border border-slate-800/80 shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-rose-400" />
                  <span>Grandmaster Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    Untimed Match
                  </span>
                  {botMetrics.thinking ? (
                    <span className="text-[10px] font-mono text-amber-400 animate-pulse">Thinking...</span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">
                      {botMetrics.thinkingTimeMs > 0 ? `${botMetrics.thinkingTimeMs}ms` : 'Ready'}
                    </span>
                  )}
                </div>
              </div>

              {/* Side / Color Selection for Bot Sparring */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleResetGame('bot', 'w')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playerColor === 'w'
                      ? 'bg-slate-100 text-slate-950 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Play as White pieces (moves first)"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shrink-0" />
                  <span>Play White</span>
                </button>

                <button
                  onClick={() => handleResetGame('bot', 'b')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playerColor === 'b'
                      ? 'bg-zinc-900 text-amber-300 border border-zinc-700 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="Play as Black pieces (bot plays first as White)"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-500 shrink-0" />
                  <span>Play Black</span>
                </button>
              </div>

              {/* Engine Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-800/60">
                <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400">Advantage</div>
                  <div className="font-mono font-bold text-amber-300 mt-0.5">{botMetrics.scoreDisplay}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400">Depth</div>
                  <div className="font-mono font-bold text-slate-200 mt-0.5">Depth {botMetrics.depth}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400">Speed</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {botMetrics.thinkingTimeMs > 0 ? `${botMetrics.thinkingTimeMs}ms` : 'Instant'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Move History Table */}
          <div className="h-64 sm:h-72">
            <MoveHistory
              moves={moves}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={handleSelectHistoryMove}
              onCopyPgn={handleCopyPgn}
              onCopyFen={handleCopyFen}
              isCopiedPgn={copiedPgn}
              isCopiedFen={copiedFen}
            />
          </div>

          {/* In-game Chat for Online Friend mode */}
          {mode === 'online' && onlineRoom && (
            <div className="h-56 sm:h-64">
              <OnlineChatDrawer
                isOpen={true}
                onToggle={() => {}}
                messages={onlineRoom.chatMessages || []}
                onSendMessage={(text) => multiplayerService.sendChat(text)}
                playerName={multiplayerService.getPlayerName()}
              />
            </div>
          )}
        </div>
      </main>

      {/* Pawn Promotion Modal */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={game.turn()}
        onSelect={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />

      {/* Game Over Announcement Modal */}
      <GameOverModal
        isOpen={isGameOverOpen && !isReviewingBoard}
        winner={gameOverResult.winner}
        winReason={gameOverResult.reason}
        playerColor={playerColor}
        movesCount={moves.length}
        gameMode={mode}
        whitePlayerName={mode === 'local' ? friend1Name : 'White'}
        blackPlayerName={mode === 'local' ? friend2Name : 'Black'}
        onRematch={() => {
          if (mode === 'online') {
            multiplayerService.requestRematch();
            setIsGameOverOpen(false);
          } else {
            handleResetGame();
          }
        }}
        onNewGame={() => {
          handleResetGame();
          setIsGameOverOpen(false);
        }}
        onReviewBoard={() => setIsReviewingBoard(true)}
      />

      {/* Online Challenge Setup / Waiting Modal */}
      <OnlineChallengeModal
        isOpen={isOnlineChallengeOpen}
        onClose={() => setIsOnlineChallengeOpen(false)}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        currentRoomId={onlineRoom?.id || null}
        isWaitingForOpponent={onlineRoom?.status === 'waiting'}
        initialPlayerName={multiplayerService.getPlayerName()}
        isOnline={isOnline}
        onSelectOfflineBot={() => handleResetGame('bot')}
        onSelectTwoFriends={() => handleResetGame('local')}
      />

      {/* Dark Mode Theme Selector */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={theme.id}
        onSelectTheme={setTheme}
      />

      {/* Real-time Offline Connectivity Status Notification */}
      <OfflineIndicator isOnline={isOnline} wasOffline={wasOffline} />
    </div>
  );
}

export default App;
