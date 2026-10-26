import { Chess } from 'chess.js';
import { OnlineRoomData } from '../types/chess';
import type { Peer as PeerType, DataConnection } from 'peerjs';

export interface MultiplayerEvents {
  onRoomUpdate?: (room: OnlineRoomData, yourColor: 'w' | 'b' | 'spectator') => void;
  onMoveMade?: (move: { from: string; to: string; san: string; piece: string; captured?: string; color: 'w' | 'b' }, room: OnlineRoomData) => void;
  onGameOver?: (room: OnlineRoomData) => void;
  onChatMessage?: (message: { id: string; sender: string; text: string; timestamp: number }) => void;
  onDrawOffered?: (from: 'w' | 'b') => void;
  onDrawDeclined?: () => void;
  onRematchRequested?: (playerId: string) => void;
  onRematchStarted?: (room: OnlineRoomData) => void;
  onError?: (msg: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private playerId: string = '';
  private playerName: string = 'Player';
  private events: MultiplayerEvents = {};
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private preferredColor: 'w' | 'b' | null = null;
  private wsConnectTimeout: number | null = null;
  public yourColor: 'w' | 'b' | 'spectator' = 'spectator';

  // P2P WebRTC / BroadcastChannel fallback for serverless hosting (Vercel)
  private isP2PMode: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private peer: PeerType | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private localRoomState: OnlineRoomData | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem('gm_chess_player_id');
      if (!storedId) {
        storedId = 'p_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('gm_chess_player_id', storedId);
      }
      this.playerId = storedId;

      const storedName = localStorage.getItem('gm_chess_player_name');
      if (storedName) {
        this.playerName = storedName;
      }
    }
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public getPlayerName(): string {
    return this.playerName;
  }

  public setPlayerName(name: string) {
    this.playerName = name.trim() || 'Player';
    try {
      localStorage.setItem('gm_chess_player_name', this.playerName);
    } catch {
      // ignore
    }
  }

  public setEvents(events: MultiplayerEvents) {
    this.events = events;
  }

  public connect(roomId: string, preferredColor?: 'w' | 'b', timeControl?: { baseMinutes: number; incrementSeconds: number }) {
    this.roomId = roomId;
    if (preferredColor) this.preferredColor = preferredColor;

    // If WebSocket is already open or connecting, send join
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.sendJoin(timeControl);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      // If WebSocket doesn't connect within 1800ms (standard for static Vercel), fall back to P2P
      if (this.wsConnectTimeout) clearTimeout(this.wsConnectTimeout);
      this.wsConnectTimeout = window.setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.initP2PFallback(roomId, preferredColor, timeControl);
        }
      }, 1800);

      this.ws.onopen = () => {
        if (this.wsConnectTimeout) clearTimeout(this.wsConnectTimeout);
        this.isP2PMode = false;
        this.events.onConnectionChange?.(true);
        this.sendJoin(timeControl);

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleInboundMessage(data);
        } catch (e) {
          console.error('Multiplayer msg error:', e);
        }
      };

      this.ws.onclose = () => {
        if (this.wsConnectTimeout) clearTimeout(this.wsConnectTimeout);
        if (!this.isP2PMode && this.roomId) {
          // Fall back to P2P if WebSocket closes
          this.initP2PFallback(this.roomId, this.preferredColor || undefined, timeControl);
        }
      };

      this.ws.onerror = () => {
        if (this.wsConnectTimeout) clearTimeout(this.wsConnectTimeout);
        if (!this.isP2PMode && this.roomId) {
          this.initP2PFallback(this.roomId, this.preferredColor || undefined, timeControl);
        }
      };
    } catch {
      this.initP2PFallback(roomId, preferredColor, timeControl);
    }
  }

  // Fallback to PeerJS WebRTC & BroadcastChannel for Vercel / serverless deployments
  private async initP2PFallback(roomId: string, preferredColor?: 'w' | 'b', timeControl?: { baseMinutes: number; incrementSeconds: number }) {
    if (this.isP2PMode) return;
    this.isP2PMode = true;

    // Clean up WS
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    const baseMins = timeControl?.baseMinutes ?? 10;
    const incSecs = timeControl?.incrementSeconds ?? 0;
    const initialTimeMs = baseMins > 0 ? baseMins * 60 * 1000 : 0;

    // Initialize local room state
    this.localRoomState = {
      id: roomId,
      createdAt: Date.now(),
      timeControl: { baseMinutes: baseMins, incrementSeconds: incSecs },
      white: preferredColor === 'w' || !preferredColor ? { id: this.playerId, name: this.playerName, connected: true } : null,
      black: preferredColor === 'b' ? { id: this.playerId, name: this.playerName, connected: true } : null,
      spectatorCount: 0,
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

    this.yourColor = preferredColor === 'b' ? 'b' : 'w';
    this.events.onConnectionChange?.(true);
    this.events.onRoomUpdate?.(this.localRoomState, this.yourColor);

    // 1. Setup local BroadcastChannel for tab-to-tab instant testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(`gmchess_${roomId}`);
        this.broadcastChannel.onmessage = (ev) => {
          this.handleP2PMessage(ev.data);
        };
        // Announce join
        this.broadcastChannel.postMessage({
          type: 'p2p_join',
          playerId: this.playerId,
          playerName: this.playerName,
          preferredColor: this.preferredColor,
          room: this.localRoomState,
        });
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. Setup PeerJS WebRTC connection
    try {
      const { Peer } = await import('peerjs');
      const hostPeerId = `gmdarkchess-${roomId}-h`;

      // Try connecting as guest first or becoming host
      const myPeer = new Peer();
      this.peer = myPeer;

      myPeer.on('open', () => {
        // Try connecting to existing host
        const conn = myPeer.connect(hostPeerId, { reliable: true });

        conn.on('open', () => {
          this.peerConnections.set(hostPeerId, conn);
          conn.send({
            type: 'p2p_join',
            playerId: this.playerId,
            playerName: this.playerName,
            preferredColor: this.preferredColor,
          });
        });

        conn.on('data', (data) => {
          this.handleP2PMessage(data);
        });

        conn.on('error', () => {
          // Not host, become host
          this.setupAsHost(roomId);
        });
      });

      myPeer.on('connection', (incomingConn) => {
        this.peerConnections.set(incomingConn.peer, incomingConn);
        incomingConn.on('data', (data) => {
          this.handleP2PMessage(data);
        });
        incomingConn.on('close', () => {
          this.peerConnections.delete(incomingConn.peer);
        });
      });
    } catch (e) {
      console.warn('WebRTC peer fallback notice:', e);
    }
  }

  private setupAsHost(roomId: string) {
    try {
      import('peerjs').then(({ Peer }) => {
        const hostPeer = new Peer(`gmdarkchess-${roomId}-h`);
        this.peer = hostPeer;
        hostPeer.on('connection', (conn) => {
          this.peerConnections.set(conn.peer, conn);
          conn.on('data', (data) => {
            this.handleP2PMessage(data);
          });
          // Send current room state on connection
          if (this.localRoomState) {
            conn.send({
              type: 'p2p_sync',
              room: this.localRoomState,
            });
          }
        });
      });
    } catch {
      // ignore
    }
  }

  private handleP2PMessage(data: any) {
    if (!data || !data.type || data.playerId === this.playerId) return;

    if (data.type === 'p2p_join') {
      if (this.localRoomState) {
        if (!this.localRoomState.black && this.yourColor === 'w') {
          this.localRoomState.black = { id: data.playerId, name: data.playerName, connected: true };
          this.localRoomState.status = 'playing';
          this.localRoomState.lastMoveTimestamp = Date.now();
        } else if (!this.localRoomState.white && this.yourColor === 'b') {
          this.localRoomState.white = { id: data.playerId, name: data.playerName, connected: true };
          this.localRoomState.status = 'playing';
          this.localRoomState.lastMoveTimestamp = Date.now();
        }
        this.events.onRoomUpdate?.(this.localRoomState, this.yourColor);
        this.sendP2P({ type: 'p2p_sync', room: this.localRoomState });
      }
      return;
    }

    if (data.type === 'p2p_sync') {
      if (data.room) {
        this.localRoomState = data.room;
        if (data.room.white?.id === this.playerId) this.yourColor = 'w';
        else if (data.room.black?.id === this.playerId) this.yourColor = 'b';
        this.events.onRoomUpdate?.(data.room, this.yourColor);
      }
      return;
    }

    this.handleInboundMessage(data);
  }

  private sendP2P(data: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch {
        // ignore
      }
    }
    this.peerConnections.forEach((conn) => {
      try {
        if (conn.open) conn.send(data);
      } catch {
        // ignore
      }
    });
  }

  private handleInboundMessage(data: any) {
    if (data.type === 'joined') {
      this.yourColor = data.yourColor;
      this.events.onRoomUpdate?.(data.room, data.yourColor);
    } else if (data.type === 'room_update') {
      this.events.onRoomUpdate?.(data.room, this.yourColor);
    } else if (data.type === 'move_made') {
      this.events.onMoveMade?.(data.move, data.room);
    } else if (data.type === 'game_over') {
      this.events.onGameOver?.(data.room);
    } else if (data.type === 'draw_offered') {
      this.events.onDrawOffered?.(data.from);
    } else if (data.type === 'draw_declined') {
      this.events.onDrawDeclined?.();
    } else if (data.type === 'rematch_requested') {
      this.events.onRematchRequested?.(data.playerId);
    } else if (data.type === 'rematch_started') {
      if (data.room.white?.id === this.playerId) this.yourColor = 'w';
      else if (data.room.black?.id === this.playerId) this.yourColor = 'b';
      this.events.onRematchStarted?.(data.room);
    } else if (data.type === 'chat_message') {
      this.events.onChatMessage?.(data.message);
    } else if (data.type === 'error') {
      this.events.onError?.(data.message);
    }
  }

  private sendJoin(timeControl?: { baseMinutes: number; incrementSeconds: number }) {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'join',
        roomId: this.roomId,
        playerId: this.playerId,
        playerName: this.playerName,
        preferredColor: this.preferredColor,
        timeControl,
      }));
    }
  }

  public sendMove(from: string, to: string, promotion?: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'move',
        roomId: this.roomId,
        playerId: this.playerId,
        move: { from, to, promotion },
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      // Validate and apply locally in P2P mode
      try {
        const engine = new Chess(this.localRoomState.fen);
        const result = engine.move({ from, to, promotion: promotion || 'q' });
        if (result) {
          this.localRoomState.fen = engine.fen();
          this.localRoomState.pgn = engine.pgn();
          this.localRoomState.moves.push(result.san);
          this.localRoomState.history.push({
            from: result.from,
            to: result.to,
            san: result.san,
            piece: result.piece,
            color: this.yourColor === 'spectator' ? 'w' : this.yourColor,
          });
          this.localRoomState.turn = engine.turn();

          if (engine.isCheckmate()) {
            this.localRoomState.status = 'checkmate';
            this.localRoomState.winner = this.yourColor === 'spectator' ? 'w' : this.yourColor;
            this.localRoomState.winReason = `Checkmate! ${this.yourColor === 'w' ? 'White' : 'Black'} wins!`;
          } else if (engine.isDraw()) {
            this.localRoomState.status = 'draw';
            this.localRoomState.winner = 'draw';
            this.localRoomState.winReason = 'Draw';
          }

          const movePayload = {
            type: 'move_made',
            move: {
              from: result.from,
              to: result.to,
              san: result.san,
              piece: result.piece,
              captured: result.captured,
              color: result.color as 'w' | 'b',
            },
            room: this.localRoomState,
          };

          this.events.onMoveMade?.(movePayload.move, this.localRoomState);
          this.sendP2P(movePayload);
        }
      } catch (err) {
        console.error('P2P Move error:', err);
      }
    }
  }

  public offerDraw() {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'offer_draw',
        roomId: this.roomId,
        playerId: this.playerId,
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      this.localRoomState.drawOfferFrom = this.yourColor === 'b' ? 'b' : 'w';
      this.sendP2P({
        type: 'draw_offered',
        from: this.localRoomState.drawOfferFrom,
        room: this.localRoomState,
      });
    }
  }

  public respondDraw(accept: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'respond_draw',
        roomId: this.roomId,
        playerId: this.playerId,
        accept,
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      if (accept) {
        this.localRoomState.status = 'draw';
        this.localRoomState.winner = 'draw';
        this.localRoomState.winReason = 'Draw by mutual agreement';
        const payload = { type: 'game_over', room: this.localRoomState };
        this.events.onGameOver?.(this.localRoomState);
        this.sendP2P(payload);
      } else {
        this.localRoomState.drawOfferFrom = null;
        this.sendP2P({ type: 'draw_declined', room: this.localRoomState });
      }
    }
  }

  public resign() {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'resign',
        roomId: this.roomId,
        playerId: this.playerId,
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      this.localRoomState.status = 'resigned';
      this.localRoomState.winner = this.yourColor === 'w' ? 'b' : 'w';
      this.localRoomState.winReason = `${this.playerName} resigned`;
      const payload = { type: 'game_over', room: this.localRoomState };
      this.events.onGameOver?.(this.localRoomState);
      this.sendP2P(payload);
    }
  }

  public requestRematch() {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'rematch',
        roomId: this.roomId,
        playerId: this.playerId,
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      if (!this.localRoomState.rematchRequestedBy) {
        this.localRoomState.rematchRequestedBy = this.playerId;
        this.sendP2P({
          type: 'rematch_requested',
          playerId: this.playerId,
          room: this.localRoomState,
        });
      } else {
        // Swap colors
        const temp = this.localRoomState.white;
        this.localRoomState.white = this.localRoomState.black;
        this.localRoomState.black = temp;
        this.localRoomState.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        this.localRoomState.pgn = '';
        this.localRoomState.moves = [];
        this.localRoomState.history = [];
        this.localRoomState.turn = 'w';
        this.localRoomState.status = 'playing';
        this.localRoomState.winner = null;
        this.localRoomState.rematchRequestedBy = null;
        this.yourColor = this.yourColor === 'w' ? 'b' : 'w';

        const payload = { type: 'rematch_started', room: this.localRoomState };
        this.events.onRematchStarted?.(this.localRoomState);
        this.sendP2P(payload);
      }
    }
  }

  public sendChat(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.roomId) {
      this.ws.send(JSON.stringify({
        type: 'chat',
        roomId: this.roomId,
        playerId: this.playerId,
        text,
      }));
    } else if (this.isP2PMode && this.localRoomState) {
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: this.playerName,
        text: text.slice(0, 200).trim(),
        timestamp: Date.now(),
      };
      this.localRoomState.chatMessages.push(newMsg);
      const payload = { type: 'chat_message', message: newMsg };
      this.events.onChatMessage?.(newMsg);
      this.sendP2P(payload);
    }
  }

  public disconnect() {
    if (this.wsConnectTimeout) clearTimeout(this.wsConnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.roomId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.peerConnections.clear();
    this.localRoomState = null;
    this.isP2PMode = false;
  }
}

export const multiplayerService = new MultiplayerService();
