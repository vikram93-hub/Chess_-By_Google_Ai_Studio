export type GameMode = 'bot' | 'online' | 'local';

export type PlayerColor = 'w' | 'b';

export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface TimeControl {
  baseMinutes: number;
  incrementSeconds: number;
  label: string;
  description: string;
}

export type ThemeId = 'slate' | 'wood' | 'emerald' | 'monochrome';

export interface ChessTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  darkSquare: string;
  lightSquare: string;
  darkSquareHover: string;
  lightSquareHover: string;
  selectedSquare: string;
  lastMoveSquare: string;
  checkSquare: string;
  boardBorder: string;
  accent: string;
  canvasBg: string;
  panelBg: string;
}

export interface BotMetrics {
  depth: number;
  nodes: number;
  evaluationScore: number; // in centipawns (from White's perspective, or current turn)
  scoreDisplay: string;    // e.g. "+1.4" or "M3" or "-0.8"
  thinkingTimeMs: number;
  pvMove?: string;
  thinking: boolean;
}

export interface MoveRecord {
  from: string;
  to: string;
  san: string;
  piece: PieceSymbol;
  color: PlayerColor;
  captured?: PieceSymbol;
  fenAfter: string;
  timestamp: number;
}

export interface CapturedPiecesState {
  capturedByWhite: PieceSymbol[]; // pieces white took (black pieces)
  capturedByBlack: PieceSymbol[]; // pieces black took (white pieces)
  whiteMaterial: number;
  blackMaterial: number;
  materialAdvantage: number; // >0 means White advantage, <0 means Black advantage
}

export interface OnlinePlayerInfo {
  id: string;
  name: string;
  connected: boolean;
}

export interface OnlineRoomData {
  id: string;
  createdAt: number;
  timeControl: {
    baseMinutes: number;
    incrementSeconds: number;
  };
  white: OnlinePlayerInfo | null;
  black: OnlinePlayerInfo | null;
  spectatorCount: number;
  fen: string;
  pgn: string;
  moves: string[];
  history: Array<{
    from: string;
    to: string;
    san: string;
    piece: string;
    color: 'w' | 'b';
  }>;
  turn: 'w' | 'b';
  status: 'waiting' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  winner: 'w' | 'b' | 'draw' | null;
  winReason?: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number | null;
  drawOfferFrom: 'w' | 'b' | null;
  rematchRequestedBy: string | null;
  chatMessages: Array<{
    id: string;
    sender: string;
    text: string;
    timestamp: number;
  }>;
}
