import { create } from "zustand";
import type {ChatMessage, PublicState, Stroke, SyncState} from "../types/socket.ts";

type GameStore = {
    name: string;
    playerId: string;
    roomCode: string;

    connected: boolean;
    publicState: PublicState | null;
    syncState: SyncState | null;

    // derived realtime sfx
    strokes: Stroke[]; // current round strokes for rendering
    chat: ChatMessage[];

    // drawer word options
    wordOptions: { options: string[]; selectEndsAt: number } | null;

    // round events
    lastCorrectGuess: { name: string; points: number; ts: number } | null;
    lastRoundEnd: { word: string; ts: number } | null;
    leaderboard: { playerId: string; name: string; score: number }[] | null;

    error: string | null;
    showCelebration: boolean;

    setName: (name: string) => void;
    ensurePlayerId: () => string;
    setRoomCode: (code: string) => void;

    setConnected: (v: boolean) => void;
    setPublicState: (s: PublicState) => void;
    setSyncState: (s: SyncState) => void;

    setWordOptions: (w: { options: string[]; selectEndsAt: number } | null) => void;

    // drawing/chat
    hydrateFromSync: (sync: SyncState) => void;
    addStroke: (stroke: Stroke) => void;
    clearStrokes: () => void;

    addChat: (m: ChatMessage) => void;
    clearChat: () => void;

    setLeaderboard: (lb: GameStore["leaderboard"]) => void;
    clearLeaderboard: () => void;

    setError: (msg: string | null) => void;
    setShowCelebration: (val: boolean) => void;
    resetRoom: () => void;

    drawerWord: string | null;
    lastRoundWord: string | null;

    setDrawerWord: (w: string | null) => void;
    setLastRoundWord: (w: string | null) => void;

};

const LS_PLAYER_ID = "skribble_player_id";
const LS_NAME = "skribble_name";
const LS_ROOM = "skribble_room_code";

function uuid() {
    return crypto.randomUUID?.() ?? `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export const useGameStore = create<GameStore>((set, get) => ({
    name: localStorage.getItem(LS_NAME) || "",
    playerId: localStorage.getItem(LS_PLAYER_ID) || "",
    roomCode: localStorage.getItem(LS_ROOM) || "",

    connected: false,
    publicState: null,
    syncState: null,

    strokes: [],
    chat: [],

    leaderboard: null as null | { playerId: string; name: string; score: number }[],
    setLeaderboard: (lb) => set({ leaderboard: lb }),
    clearLeaderboard: () => set({ leaderboard: null }),

    wordOptions: null,

    lastCorrectGuess: null,
    lastRoundEnd: null,

    error: null,
    showCelebration: false,

    setName: (name) => {
        localStorage.setItem(LS_NAME, name);
        set({ name });
    },

    drawerWord: null,
    lastRoundWord: null,
    setDrawerWord: (w) => set({ drawerWord: w }),
    setLastRoundWord: (w) => set({ lastRoundWord: w }),

    ensurePlayerId: () => {
        const cur = get().playerId;
        if (cur) return cur;
        const id = uuid();
        localStorage.setItem(LS_PLAYER_ID, id);
        set({ playerId: id });
        return id;
    },

    setRoomCode: (code) => {
        const normalized = code.trim().toUpperCase();
        localStorage.setItem(LS_ROOM, normalized);
        set({ roomCode: normalized });
    },

    setConnected: (v) => set({ connected: v }),
    setPublicState: (s) => set({ publicState: s }),
    setSyncState: (s) => set({ syncState: s }),

    setWordOptions: (w) => set({ wordOptions: w }),

    hydrateFromSync: (sync) => {
        const roomCode = sync.roomCode;

        // sync strokes -> convert into Stroke[] with roomCode
        const strokes: Stroke[] = (sync.strokes || []).map((s) => ({ roomCode, ...s })) as any;

        set({
            syncState: sync,
            strokes,
            wordOptions:
                sync.phase === "selecting_word" && sync.wordOptions?.length
                    ? { options: sync.wordOptions, selectEndsAt: sync.wordSelectEndsAt || Date.now() }
                    : null,
        });
    },

    addStroke: (stroke) => set((st) => ({ strokes: [...st.strokes, stroke].slice(-3000) })),
    clearStrokes: () => set({ strokes: [] }),

    addChat: (m) => set((st) => ({ chat: [...st.chat, m].slice(-200) })),
    clearChat: () => set({ chat: [] }),

    setError: (msg) => set({ error: msg }),
    setShowCelebration: (val) => set({ showCelebration: val }),

    resetRoom: () => {
        localStorage.removeItem(LS_ROOM);
        set({
            roomCode: "",
            publicState: null,
            syncState: null,
            strokes: [],
            chat: [],
            wordOptions: null,
            lastCorrectGuess: null,
            lastRoundEnd: null,
            leaderboard: null,
            error: null,
        });
    },
}));
