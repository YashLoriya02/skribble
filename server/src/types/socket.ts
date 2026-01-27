import type { DrawPoint } from "./game";

export type CreateRoomPayload = { name: string; playerId: string };
export type JoinRoomPayload = { roomCode: string; name: string; playerId: string };
export type LeaveRoomPayload = { roomCode: string; playerId: string };

export type LobbyReadyPayload = { roomCode: string; playerId: string; isReady: boolean };

export type UpdateSettingsPayload = {
  roomCode: string;
  playerId: string;
  settings: Partial<{
    maxRounds: number;
    customWords?: string[];
    roundDurationSec: number;
    maxPlayers: number
  }>;
};

export type GameStartPayload = { roomCode: string; playerId: string };
export type RoundSelectWordPayload = { roomCode: string; playerId: string; word: string };

export type DrawStrokePayload = {
  roomCode: string;
  playerId: string;
  strokeId: string;
  color: string;
  width: number;
  points: DrawPoint[];
};

export type DrawClearPayload = { roomCode: string; playerId: string };
export type SyncRequestPayload = { roomCode: string; playerId: string };

// ✅ Step 6 reconnect (rebind socket to playerId)
export type ReconnectHelloPayload = { roomCode: string; playerId: string };

export type ChatSendPayload = { roomCode: string; playerId: string; text: string };

export type RoomStatePublic = {
  roomCode: string;
  createdAt: number;
  hostPlayerId: string;
  phase: string;

  players: Array<{
    playerId: string;
    name: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
    isReady: boolean;
    hasGuessed: boolean;
  }>;

  settings: { maxPlayers: number; maxRounds: number; roundDurationSec: number };

  currentRound: number;
  drawerIndex: number;
  drawerOrder: string[];

  round: {
    drawerId: string | null;
    mask: string;
    endsAt: number | null;
    wordSelectEndsAt: number | null;
  };
};

export type ServerToClientEvents = {
  "room:state": (state: RoomStatePublic) => void;
  "room:error": (message: string) => void;

  "room:created": (data: { roomCode: string; state: RoomStatePublic }) => void;
  "room:joined": (data: { roomCode: string; state: RoomStatePublic }) => void;

  "game:started": (data: { roomCode: string }) => void;
  "game:ended": (data: { roomCode: string; leaderboard: Array<{ playerId: string; name: string; score: number }> }) => void;

  "round:wordOptions": (data: { roomCode: string; options: string[]; selectEndsAt: number }) => void;
  "round:start": (data: { roomCode: string; drawerId: string; mask: string; endsAt: number }) => void;
  "round:mask": (data: { roomCode: string; mask: string }) => void;
  "round:end": (data: { roomCode: string; word: string }) => void;
  "round:word": ({ roomCode, word }: { roomCode: string; word: string }) => void
  "game:rematchStarted": ({ roomCode }: { roomCode: string }) => void

  "draw:stroke": (data: {
    roomCode: string;
    drawerId: string;
    strokeId: string;
    color: string;
    width: number;
    points: DrawPoint[];
    createdAt: number;
  }) => void;

  "draw:clear": (data: { roomCode: string }) => void;

  "sync:state": (data: {
    roomCode: string;
    phase: string;
    currentRound: number;
    drawerId: string | null;
    mask: string;
    endsAt: number | null;
    wordSelectEndsAt: number | null;

    strokes: Array<{
      drawerId: string;
      strokeId: string;
      color: string;
      width: number;
      points: DrawPoint[];
      createdAt: number;
    }>;

    wordOptions?: string[];
  }) => void;

  "chat:message": (data: { roomCode: string; playerId: string; name: string; text: string; ts: number }) => void;
  "guess:correct": (data: { roomCode: string; playerId: string; name: string; points: number }) => void;
  "score:update": (data: { roomCode: string; scores: Array<{ playerId: string; score: number }> }) => void;
};

export type ClientToServerEvents = {
  "room:create": (payload: CreateRoomPayload) => void;
  "room:join": (payload: JoinRoomPayload) => void;
  "room:leave": (payload: LeaveRoomPayload) => void;

  "lobby:ready": (payload: LobbyReadyPayload) => void;
  "room:updateSettings": (payload: UpdateSettingsPayload) => void;

  "game:start": (payload: GameStartPayload) => void;
  "round:selectWord": (payload: RoundSelectWordPayload) => void;
  "game:rematch": ({ roomCode, playerId, mode }: { roomCode: string, playerId: string, mode: string }) => void

  "draw:stroke": (payload: DrawStrokePayload) => void;
  "draw:clear": (payload: DrawClearPayload) => void;

  "sync:request": (payload: SyncRequestPayload) => void;

  "reconnect:hello": (payload: ReconnectHelloPayload) => void;
  "chat:send": (payload: ChatSendPayload) => void;
  "draw:undo": (payload: LeaveRoomPayload) => void;
};
