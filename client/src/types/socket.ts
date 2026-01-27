export type Point = [number, number];

export type PublicPlayer = {
    playerId: string;
    name: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
    isReady: boolean;
    hasGuessed: boolean;
};

export type PublicState = {
    roomCode: string;
    createdAt: number;
    hostPlayerId: string;
    phase: "lobby" | "selecting_word" | "drawing" | "round_end" | "game_end";
    players: PublicPlayer[];
    settings: {
        maxPlayers: number;
        maxRounds: number;
        roundDurationSec: number;
        customWords: string[]
    };
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

export type Stroke = {
    roomCode: string;
    strokeId: string;
    drawerId: string;
    color: string;
    width: number;
    points: Point[];
    createdAt: number;
};

export type SyncState = {
    roomCode: string;
    phase: PublicState["phase"];
    currentRound: number;
    drawerId: string | null;
    mask: string;
    endsAt: number | null;
    wordSelectEndsAt: number | null;
    strokes: Omit<Stroke, "roomCode">[]; // backend sync gives no roomCode per stroke
    wordOptions?: string[]; // only if selecting_word and player is drawer
};

export type ChatMessage = {
    roomCode: string;
    playerId: string;
    name: string;
    text: string;
    ts: number;
    type?: "normal" | "correct" | "reveal";
};


export type GuessCorrect = {
    roomCode: string;
    playerId: string;
    name: string;
    points: number;
};

export type ScoreUpdate = {
    roomCode: string;
    scores: { playerId: string; score: number }[];
};

export type RoundStart = {
    roomCode: string;
    drawerId: string;
    mask: string;
    endsAt: number;
};

export type RoundMask = { roomCode: string; mask: string };
export type RoundEnd = { roomCode: string; word: string };

export type GameEnded = {
    roomCode: string;
    leaderboard: { playerId: string; name: string; score: number }[];
};

export type ServerToClientEvents = {
    "room:created": (payload: { roomCode: string; state: PublicState }) => void;
    "room:joined": (payload: { roomCode: string; state: PublicState }) => void;
    "room:state": (state: PublicState) => void;
    "round:word": (payload: { roomCode: string; word: string }) => void;

    "sync:state": (sync: SyncState) => void;

    "round:wordOptions": (payload: { roomCode: string; options: string[]; selectEndsAt: number }) => void;
    "round:start": (payload: RoundStart) => void;
    "round:mask": (payload: RoundMask) => void;
    "round:end": (payload: RoundEnd) => void;

    "draw:stroke": (stroke: Stroke) => void;
    "draw:clear": (payload: { roomCode: string }) => void;

    "chat:message": (msg: ChatMessage) => void;
    "guess:correct": (payload: GuessCorrect) => void;
    "score:update": (payload: ScoreUpdate) => void;

    "game:ended": (payload: GameEnded) => void;

    "room:error": (message: string) => void;
    "game:started": (payload: { roomCode: string }) => void;
    "game:rematchStarted": () => void;
};

export type ClientToServerEvents = {
    "room:create": (payload: { name: string; playerId: string }) => void;
    "room:join": (payload: { roomCode: string; name: string; playerId: string }) => void;
    "reconnect:hello": (payload: { roomCode: string; playerId: string }) => void;
    "room:leave": (payload: { roomCode: string; playerId: string }) => void;
    "game:rematch": ({roomCode, playerId, mode}: { roomCode: string, playerId: string, mode: string}) => void;

    "lobby:ready": (payload: { roomCode: string; playerId: string; isReady: boolean }) => void;
    "room:updateSettings": (payload: { roomCode: string; playerId: string; settings: any }) => void;

    "game:start": (payload: { roomCode: string; playerId: string }) => void;

    "round:selectWord": (payload: { roomCode: string; playerId: string; word: string }) => void;

    "draw:stroke": (payload: {
        roomCode: string;
        playerId: string;
        strokeId: string;
        color: string;
        width: number;
        points: Point[];
    }) => void;

    "draw:clear": (payload: { roomCode: string; playerId: string }) => void;

    "sync:request": (payload: { roomCode: string; playerId: string }) => void;
    "chat:send": (payload: { roomCode: string; playerId: string; text: string }) => void;
    "draw:undo": (payload: { roomCode: string; playerId: string }) => void
};
