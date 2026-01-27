export type RoomPhase =
    | "lobby"
    | "selecting_word"
    | "drawing"
    | "round_end"
    | "game_end";

export type Player = {
    playerId: string;
    socketId: string;
    name: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
    isReady: boolean;
    joinedAt: number;
    lastChatAt?: number;
};

export type RoomSettings = {
    maxPlayers: number;
    maxRounds: number;
    customWords?: string[];
    roundDurationSec: number;
};

export type DrawPoint = [number, number];
export type Stroke = {
    strokeId: string;
    drawerId: string;
    color: string;
    width: number;
    points: DrawPoint[];
    createdAt: number;
};

export type RoundState = {
    drawerId: string | null;

    word: string | null;
    wordOptions: string[];
    wordSelectEndsAt: number | null;

    mask: string;
    endsAt: number | null;

    strokes: Stroke[];

    guessedPlayerIds: Set<string>;

    timers: {
        selectTimeout?: NodeJS.Timeout;
        hint1?: NodeJS.Timeout;
        hint2?: NodeJS.Timeout;
        roundEnd?: NodeJS.Timeout;
        nextRound?: NodeJS.Timeout;
    };
};

export type RoomState = {
    roomCode: string;
    createdAt: number;

    hostPlayerId: string;
    phase: RoomPhase;

    players: Player[];
    settings: RoomSettings;

    currentRound: number;
    drawerOrder: string[];
    drawerIndex: number;

    round: RoundState;
};
