import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

interface PlayerSlot {
  id: string;
  name: string;
  connected: boolean;
  ws?: WebSocket;
}

interface RoomState {
  id: string;
  createdAt: number;
  timeControl: {
    baseMinutes: number;
    incrementSeconds: number;
  };
  white: PlayerSlot | null;
  black: PlayerSlot | null;
  spectators: PlayerSlot[];
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

// In-memory rooms
const rooms = new Map<string, RoomState>();

// Generate short random readable room code
function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Clean sanitized room payload for clients (strips WebSocket references)
function sanitizeRoom(room: RoomState) {
  return {
    id: room.id,
    createdAt: room.createdAt,
    timeControl: room.timeControl,
    white: room.white ? { id: room.white.id, name: room.white.name, connected: room.white.connected } : null,
    black: room.black ? { id: room.black.id, name: room.black.name, connected: room.black.connected } : null,
    spectatorCount: room.spectators.length,
    fen: room.fen,
    pgn: room.pgn,
    moves: room.moves,
    history: room.history,
    turn: room.turn,
    status: room.status,
    winner: room.winner,
    winReason: room.winReason,
    whiteTimeMs: room.whiteTimeMs,
    blackTimeMs: room.blackTimeMs,
    lastMoveTimestamp: room.lastMoveTimestamp,
    drawOfferFrom: room.drawOfferFrom,
    rematchRequestedBy: room.rematchRequestedBy,
    chatMessages: room.chatMessages.slice(-50),
  };
}

// Broadcast room update to all participants
function broadcastToRoom(room: RoomState, payload: object) {
  const message = JSON.stringify(payload);
  const send = (ws?: WebSocket) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  };

  send(room.white?.ws);
  send(room.black?.ws);
  room.spectators.forEach((spec) => send(spec.ws));
}

// Tick clock interval to update active player time
setInterval(() => {
  const now = Date.now();
  for (const [, room] of rooms.entries()) {
    if (room.status === 'playing' && room.lastMoveTimestamp && room.timeControl.baseMinutes > 0) {
      const elapsed = now - room.lastMoveTimestamp;
      if (room.turn === 'w') {
        const remaining = Math.max(0, room.whiteTimeMs - elapsed);
        if (remaining <= 0) {
          room.whiteTimeMs = 0;
          room.status = 'timeout';
          room.winner = 'b';
          room.winReason = 'White ran out of time';
          broadcastToRoom(room, { type: 'game_over', room: sanitizeRoom(room) });
        }
      } else {
        const remaining = Math.max(0, room.blackTimeMs - elapsed);
        if (remaining <= 0) {
          room.blackTimeMs = 0;
          room.status = 'timeout';
          room.winner = 'w';
          room.winReason = 'Black ran out of time';
          broadcastToRoom(room, { type: 'game_over', room: sanitizeRoom(room) });
        }
      }
    }
  }
}, 500);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.type === 'join') {
        const { roomId, playerId, playerName, preferredColor, timeControl } = data;
        let room = rooms.get(roomId);

        if (!room) {
          // Initialize new room
          const baseMins = timeControl?.baseMinutes ?? 10;
          const incSecs = timeControl?.incrementSeconds ?? 0;
          const initialTimeMs = baseMins > 0 ? baseMins * 60 * 1000 : 0;

          room = {
            id: roomId,
            createdAt: Date.now(),
            timeControl: { baseMinutes: baseMins, incrementSeconds: incSecs },
            white: null,
            black: null,
            spectators: [],
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            pgn: '',
            moves: [],
            history: [],
            turn: 'w',
            status: 'waiting',
            winner: null,
            whiteTimeMs: initialTimeMs,
            blackTimeMs: initialTimeMs,
            lastMoveTimestamp: null,
            drawOfferFrom: null,
            rematchRequestedBy: null,
            chatMessages: [
              {
                id: 'sys-1',
                sender: 'System',
                text: 'Challenge link created! Share it with your friend to begin.',
                timestamp: Date.now(),
              },
            ],
          };
          rooms.set(roomId, room);
        }

        currentRoomId = roomId;
        currentPlayerId = playerId;

        // Check if player is reconnecting
        if (room.white && room.white.id === playerId) {
          room.white.connected = true;
          room.white.ws = ws;
          if (playerName) room.white.name = playerName;
        } else if (room.black && room.black.id === playerId) {
          room.black.connected = true;
          room.black.ws = ws;
          if (playerName) room.black.name = playerName;
        } else {
          // New player assignment
          const pSlot: PlayerSlot = {
            id: playerId,
            name: playerName || 'Player',
            connected: true,
            ws,
          };

          if (!room.white && (preferredColor === 'w' || (!preferredColor && !room.black))) {
            room.white = pSlot;
          } else if (!room.black && (preferredColor === 'b' || !room.white)) {
            room.black = pSlot;
          } else if (!room.white) {
            room.white = pSlot;
          } else if (!room.black) {
            room.black = pSlot;
          } else {
            // Already full, join as spectator
            room.spectators.push(pSlot);
          }
        }

        // Check if both players are present to start
        if (room.white && room.black && room.status === 'waiting') {
          room.status = 'playing';
          room.lastMoveTimestamp = Date.now();
          room.chatMessages.push({
            id: `sys-${Date.now()}`,
            sender: 'System',
            text: `Match started! ${room.white.name} (White) vs ${room.black.name} (Black).`,
            timestamp: Date.now(),
          });
        }

        // Send state back to joining client and broadcast
        ws.send(JSON.stringify({
          type: 'joined',
          yourColor: room.white?.id === playerId ? 'w' : room.black?.id === playerId ? 'b' : 'spectator',
          room: sanitizeRoom(room),
        }));

        broadcastToRoom(room, {
          type: 'room_update',
          room: sanitizeRoom(room),
        });
        return;
      }

      if (data.type === 'move') {
        const { roomId, playerId, move } = data;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        // Verify whose turn it is and player authorization
        const playerColor = room.white?.id === playerId ? 'w' : room.black?.id === playerId ? 'b' : null;
        if (!playerColor || playerColor !== room.turn) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
          return;
        }

        // Validate move using Chess engine
        const engine = new Chess(room.fen);
        try {
          const result = engine.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || 'q',
          });

          if (!result) {
            ws.send(JSON.stringify({ type: 'error', message: 'Illegal move' }));
            return;
          }

          // Deduct elapsed time and add increment
          const now = Date.now();
          if (room.lastMoveTimestamp && room.timeControl.baseMinutes > 0) {
            const elapsed = now - room.lastMoveTimestamp;
            const inc = (room.timeControl.incrementSeconds || 0) * 1000;
            if (playerColor === 'w') {
              room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed + inc);
            } else {
              room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed + inc);
            }
          }
          room.lastMoveTimestamp = now;

          // Update room state
          room.fen = engine.fen();
          room.pgn = engine.pgn();
          room.moves.push(result.san);
          room.history.push({
            from: result.from,
            to: result.to,
            san: result.san,
            piece: result.piece,
            color: playerColor,
          });
          room.turn = engine.turn();
          room.drawOfferFrom = null; // moving cancels any pending draw offer

          // Check terminal conditions
          if (engine.isCheckmate()) {
            room.status = 'checkmate';
            room.winner = playerColor;
            room.winReason = `Checkmate! ${playerColor === 'w' ? 'White' : 'Black'} wins!`;
          } else if (engine.isDraw()) {
            room.status = 'draw';
            room.winner = 'draw';
            if (engine.isStalemate()) {
              room.winReason = 'Draw by Stalemate';
            } else if (engine.isThreefoldRepetition()) {
              room.winReason = 'Draw by Threefold Repetition';
            } else if (engine.isInsufficientMaterial()) {
              room.winReason = 'Draw by Insufficient Material';
            } else if (engine.isDrawByFiftyMoves()) {
              room.winReason = 'Draw by 50-move rule';
            } else {
              room.winReason = 'Draw';
            }
          }

          broadcastToRoom(room, {
            type: 'move_made',
            move: {
              from: result.from,
              to: result.to,
              san: result.san,
              piece: result.piece,
              captured: result.captured,
              color: playerColor,
            },
            room: sanitizeRoom(room),
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid move: ' + String(err) }));
        }
        return;
      }

      if (data.type === 'resign') {
        const { roomId, playerId } = data;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        const isWhite = room.white?.id === playerId;
        const isBlack = room.black?.id === playerId;
        if (!isWhite && !isBlack) return;

        room.status = 'resigned';
        room.winner = isWhite ? 'b' : 'w';
        room.winReason = `${isWhite ? room.white?.name : room.black?.name} resigned`;
        broadcastToRoom(room, { type: 'game_over', room: sanitizeRoom(room) });
        return;
      }

      if (data.type === 'offer_draw') {
        const { roomId, playerId } = data;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') return;

        const isWhite = room.white?.id === playerId;
        const isBlack = room.black?.id === playerId;
        if (!isWhite && !isBlack) return;

        room.drawOfferFrom = isWhite ? 'w' : 'b';
        broadcastToRoom(room, {
          type: 'draw_offered',
          from: room.drawOfferFrom,
          room: sanitizeRoom(room),
        });
        return;
      }

      if (data.type === 'respond_draw') {
        const { roomId, playerId, accept } = data;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing' || !room.drawOfferFrom) return;

        const isWhite = room.white?.id === playerId;
        const isBlack = room.black?.id === playerId;
        const respondingColor = isWhite ? 'w' : isBlack ? 'b' : null;

        if (respondingColor && respondingColor !== room.drawOfferFrom) {
          if (accept) {
            room.status = 'draw';
            room.winner = 'draw';
            room.winReason = 'Draw by mutual agreement';
            room.drawOfferFrom = null;
            broadcastToRoom(room, { type: 'game_over', room: sanitizeRoom(room) });
          } else {
            room.drawOfferFrom = null;
            broadcastToRoom(room, {
              type: 'draw_declined',
              room: sanitizeRoom(room),
            });
          }
        }
        return;
      }

      if (data.type === 'rematch') {
        const { roomId, playerId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        if (!room.rematchRequestedBy) {
          room.rematchRequestedBy = playerId;
          broadcastToRoom(room, {
            type: 'rematch_requested',
            playerId,
            room: sanitizeRoom(room),
          });
        } else if (room.rematchRequestedBy !== playerId) {
          // Both accepted, reset board with swapped colors
          const temp = room.white;
          room.white = room.black;
          room.black = temp;

          const baseMins = room.timeControl.baseMinutes;
          const initialTimeMs = baseMins > 0 ? baseMins * 60 * 1000 : 0;

          room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          room.pgn = '';
          room.moves = [];
          room.history = [];
          room.turn = 'w';
          room.status = 'playing';
          room.winner = null;
          room.winReason = undefined;
          room.whiteTimeMs = initialTimeMs;
          room.blackTimeMs = initialTimeMs;
          room.lastMoveTimestamp = Date.now();
          room.drawOfferFrom = null;
          room.rematchRequestedBy = null;
          room.chatMessages.push({
            id: `sys-${Date.now()}`,
            sender: 'System',
            text: 'Rematch started! Colors swapped.',
            timestamp: Date.now(),
          });

          broadcastToRoom(room, {
            type: 'rematch_started',
            room: sanitizeRoom(room),
          });
        }
        return;
      }

      if (data.type === 'chat') {
        const { roomId, playerId, text } = data;
        const room = rooms.get(roomId);
        if (!room || !text || typeof text !== 'string') return;

        const senderName =
          room.white?.id === playerId
            ? room.white.name
            : room.black?.id === playerId
            ? room.black.name
            : 'Spectator';

        const newMsg = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: senderName,
          text: text.slice(0, 200).trim(),
          timestamp: Date.now(),
        };

        room.chatMessages.push(newMsg);
        broadcastToRoom(room, {
          type: 'chat_message',
          message: newMsg,
        });
        return;
      }
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        if (room.white?.id === currentPlayerId) room.white.connected = false;
        if (room.black?.id === currentPlayerId) room.black.connected = false;
        room.spectators = room.spectators.filter((s) => s.id !== currentPlayerId);

        broadcastToRoom(room, {
          type: 'player_disconnected',
          playerId: currentPlayerId,
          room: sanitizeRoom(room),
        });
      }
    }
  });
});

// REST API
app.post('/api/rooms', (req, res) => {
  const { timeControl } = req.body || {};
  const roomId = generateRoomId();

  const baseMins = timeControl?.baseMinutes ?? 10;
  const incSecs = timeControl?.incrementSeconds ?? 0;
  const initialTimeMs = baseMins > 0 ? baseMins * 60 * 1000 : 0;

  const room: RoomState = {
    id: roomId,
    createdAt: Date.now(),
    timeControl: { baseMinutes: baseMins, incrementSeconds: incSecs },
    white: null,
    black: null,
    spectators: [],
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '',
    moves: [],
    history: [],
    turn: 'w',
    status: 'waiting',
    winner: null,
    whiteTimeMs: initialTimeMs,
    blackTimeMs: initialTimeMs,
    lastMoveTimestamp: null,
    drawOfferFrom: null,
    rematchRequestedBy: null,
    chatMessages: [
      {
        id: 'sys-1',
        sender: 'System',
        text: 'Challenge link created! Share it with your friend to begin.',
        timestamp: Date.now(),
      },
    ],
  };

  rooms.set(roomId, room);
  res.json({ roomId });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(sanitizeRoom(room));
});

// Dev Vite middleware or static serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
