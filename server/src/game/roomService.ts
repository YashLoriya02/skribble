import type { Player, RoomSettings, RoomState, RoundState, Stroke } from "../types/game";
import { generateRoomCode } from "../utils/roomCode";
import { deleteRoom, getRoom, roomStore, setRoom } from "./roomStore";
import { pickRandomWords } from "./wordBank";
import { GameGateway } from "../socket/gameGateway";

const DEFAULT_SETTINGS: RoomSettings = {
    maxPlayers: 8,
    maxRounds: 5,
    roundDurationSec: 80,
};

const WORD_SELECT_WINDOW_MS = 10_000;
const ROUND_END_PAUSE_MS = 5_000;

const MAX_STROKES_PER_ROUND = 1200;
const MAX_POINTS_PER_STROKE = 300;

const CHAT_COOLDOWN_MS = 350;

function createEmptyRound(): RoundState {
    return {
        drawerId: null,
        word: null,
        wordOptions: [],
        wordSelectEndsAt: null,
        mask: "",
        endsAt: null,
        strokes: [],
        guessedPlayerIds: new Set<string>(),
        timers: {},
    };
}

function toPublicState(room: RoomState) {
    return {
        roomCode: room.roomCode,
        createdAt: room.createdAt,
        hostPlayerId: room.hostPlayerId,
        phase: room.phase,
        players: room.players.map((p) => ({
            playerId: p.playerId,
            name: p.name,
            score: p.score,
            isHost: p.isHost,
            isConnected: p.isConnected,
            isReady: p.isReady,
            hasGuessed: room.round.guessedPlayerIds.has(p.playerId),
        })),
        settings: room.settings,
        currentRound: room.currentRound,
        drawerIndex: room.drawerIndex,
        drawerOrder: room.drawerOrder,
        round: {
            drawerId: room.round.drawerId,
            mask: room.round.mask,
            endsAt: room.round.endsAt,
            wordSelectEndsAt: room.round.wordSelectEndsAt,
        },
    };
}

function requireRoom(roomCode: string): RoomState {
    const room = getRoom(roomCode);
    if (!room) throw new Error("Room not found");
    return room;
}

function requireHost(room: RoomState, playerId: string) {
    if (room.hostPlayerId !== playerId) throw new Error("Only host can perform this action");
}

function requireDrawer(room: RoomState, playerId: string) {
    if (room.round.drawerId !== playerId) throw new Error("Only drawer can do this action");
}

function normalizeRounds(value: number) {
    const allowed = [1, 3, 5, 7];
    return allowed.includes(value) ? value : DEFAULT_SETTINGS.maxRounds;
}

function normalizeDuration(value: number) {
    const allowed = [60, 80, 100];
    return allowed.includes(value) ? value : DEFAULT_SETTINGS.roundDurationSec;
}

function upsertPlayer(
    room: RoomState,
    incoming: Omit<Player, "score" | "isHost" | "joinedAt" | "isReady">
) {
    const idx = room.players.findIndex((p) => p.playerId === incoming.playerId);

    if (idx >= 0) {
        const prev = room.players[idx];
        room.players[idx] = {
            ...prev,
            socketId: incoming.socketId,
            name: incoming.name || prev.name,
            isConnected: true,
        };
    } else {
        if (room.players.length >= room.settings.maxPlayers) throw new Error("Room is full");
        room.players.push({
            ...incoming,
            score: 0,
            isHost: false,
            isConnected: true,
            isReady: false,
            joinedAt: Date.now(),
        });
    }
}

function reshuffleDrawerOrder(room: RoomState) {
    const ids = room.players.map((p) => p.playerId);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    room.drawerOrder = ids;
    room.drawerIndex = 0;
}

function clearRoundTimers(room: RoomState) {
    const t = room.round.timers;
    if (t.selectTimeout) clearTimeout(t.selectTimeout);
    if (t.hint1) clearTimeout(t.hint1);
    if (t.hint2) clearTimeout(t.hint2);
    if (t.roundEnd) clearTimeout(t.roundEnd);
    if (t.nextRound) clearTimeout(t.nextRound);
    room.round.timers = {};
}

function buildMask(word: string, revealedIndexes: Set<number> = new Set()): string {
    const chars = word.split("");
    const out = chars.map((ch, idx) => (revealedIndexes.has(idx) ? ch.toUpperCase() : "_"));
    return out.join(" ");
}

function revealRandomLetter(word: string, currentMask: string): string {
    const raw = currentMask.replace(/\s/g, "");
    const unrevealed: number[] = [];
    for (let i = 0; i < word.length; i++) if (raw[i] === "_") unrevealed.push(i);
    if (unrevealed.length === 0) return currentMask;

    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];

    const revealed = new Set<number>();
    for (let i = 0; i < word.length; i++) if (raw[i] !== "_") revealed.add(i);
    revealed.add(pick);

    return buildMask(word, revealed);
}

function normalizeGuess(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ");
}

function calcGuessPoints(params: {
    endsAt: number;
    now: number;
    roundDurationSec: number;
    orderIndex: number;
}) {
    const { endsAt, now, roundDurationSec, orderIndex } = params;
    const timeLeftMs = Math.max(0, endsAt - now);
    const timeLeftRatio = Math.min(1, timeLeftMs / (roundDurationSec * 1000));
    const base = 100;
    const timeBonus = Math.floor(timeLeftRatio * 150);
    const orderPenalty = orderIndex * 10;
    return Math.max(20, base + timeBonus - orderPenalty);
}

function leaderboard(room: RoomState) {
    return [...room.players]
        .sort((a, b) => b.score - a.score)
        .map((p) => ({ playerId: p.playerId, name: p.name, score: p.score }));
}

export const RoomService = {
    toPublicState,

    createRoom(params: { playerId: string; name: string; socketId: string }) {
        let roomCode = generateRoomCode();
        while (getRoom(roomCode)) roomCode = generateRoomCode();

        const host: Player = {
            playerId: params.playerId.trim(),
            socketId: params.socketId,
            name: params.name.trim(),
            score: 0,
            isHost: true,
            isConnected: true,
            isReady: false,
            joinedAt: Date.now(),
        };

        const room: RoomState = {
            roomCode,
            createdAt: Date.now(),
            hostPlayerId: host.playerId,
            phase: "lobby",
            players: [host],
            settings: { ...DEFAULT_SETTINGS },
            currentRound: 0,
            drawerOrder: [host.playerId],
            drawerIndex: 0,
            round: createEmptyRound(),
        };

        setRoom(roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    joinRoom(params: { roomCode: string; playerId: string; name: string; socketId: string }) {
        const room = requireRoom(params.roomCode);

        upsertPlayer(room, {
            playerId: params.playerId.trim(),
            socketId: params.socketId,
            name: params.name.trim(),
            isConnected: true,
        });

        if (room.phase === "lobby") {
            room.drawerOrder = room.players.map((p) => p.playerId);
            room.drawerIndex = 0;
        }

        setRoom(room.roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    // ✅ Step 6: reconnect bind (no duplicate join needed)
    reconnectHello(params: { roomCode: string; playerId: string; socketId: string }) {
        const room = requireRoom(params.roomCode);
        const player = room.players.find((p) => p.playerId === params.playerId);
        if (!player) throw new Error("Player not found in room");

        player.socketId = params.socketId;
        player.isConnected = true;

        setRoom(room.roomCode, room);
        GameGateway.roomState(room.roomCode, toPublicState(room));

        return { room, publicState: toPublicState(room) };
    },

    setReady(params: { roomCode: string; playerId: string; isReady: boolean }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "lobby") throw new Error("Cannot change ready status after game start");

        const player = room.players.find((p) => p.playerId === params.playerId);
        if (!player) throw new Error("Player not found");
        player.isReady = !!params.isReady;

        setRoom(room.roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    updateSettings(params: { roomCode: string; playerId: string; settings: Partial<RoomSettings> }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "lobby") throw new Error("Cannot change settings after game start");
        requireHost(room, params.playerId);

        if (typeof params.settings.maxRounds === "number") {
            room.settings.maxRounds = normalizeRounds(params.settings.maxRounds);
        }
        if (typeof params.settings.roundDurationSec === "number") {
            room.settings.roundDurationSec = normalizeDuration(params.settings.roundDurationSec);
        }
        if (typeof params.settings.maxPlayers === "number") {
            const v = Math.max(2, Math.min(12, Math.floor(params.settings.maxPlayers)));
            if (v < room.players.length) throw new Error("maxPlayers cannot be less than current players");
            room.settings.maxPlayers = v;
        }
        if (Array.isArray(params.settings.customWords)) {
            room.settings.customWords = sanitizeCustomWords(params.settings.customWords);
        }

        function sanitizeCustomWords(words: string[]) {
            const cleaned = words
                .map((w) => String(w).trim().replace(/\s+/g, " "))
                .filter((w) => w.length >= 2 && w.length <= 30)
                .slice(0, 250);

            const seen = new Set<string>();
            const out: string[] = [];
            for (const w of cleaned) {
                const key = w.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(w);
            }
            return out;
        }

        setRoom(room.roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    startGame(params: { roomCode: string; playerId: string }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "lobby") throw new Error("Game already started");
        requireHost(room, params.playerId);

        if (room.players.length < 2) throw new Error("Need at least 2 players to start");
        const allReady = room.players.every((p) => p.isReady || p.isHost);
        if (!allReady) throw new Error("All players must be ready");

        room.currentRound = 1;
        reshuffleDrawerOrder(room);
        RoomService.beginWordSelection(room);

        setRoom(room.roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    beginWordSelection(room: RoomState) {
        clearRoundTimers(room);

        const drawerId = room.drawerOrder[room.drawerIndex];
        if (!drawerId) throw new Error("No drawer available");

        room.phase = "selecting_word";
        room.round.drawerId = drawerId;
        room.round.word = null;
        room.round.guessedPlayerIds = new Set<string>();
        room.round.strokes = [];
        room.round.mask = "";
        room.round.endsAt = null;

        room.round.wordOptions = pickRandomWords(room).map((w) => w.toLowerCase());
        room.round.wordSelectEndsAt = Date.now() + WORD_SELECT_WINDOW_MS;

        setRoom(room.roomCode, room);
        GameGateway.roomState(room.roomCode, toPublicState(room));

        // send options to drawer ONLY
        const drawer = room.players.find((p) => p.playerId === drawerId);
        if (drawer) {
            GameGateway.io().to(drawer.socketId).emit("round:wordOptions", {
                roomCode: room.roomCode,
                options: room.round.wordOptions,
                selectEndsAt: room.round.wordSelectEndsAt!,
            });
        }

        room.round.timers.selectTimeout = setTimeout(() => {
            const latest = getRoom(room.roomCode);
            if (!latest) return;
            if (latest.phase !== "selecting_word") return;
            if (latest.round.word) return;

            const autoWord = latest.round.wordOptions[0];
            if (!autoWord) return;

            try {
                RoomService.selectWord({
                    roomCode: latest.roomCode,
                    playerId: latest.round.drawerId!,
                    word: autoWord,
                });
            } catch {
            }
        }, WORD_SELECT_WINDOW_MS);
    },

    selectWord(params: { roomCode: string; playerId: string; word: string }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "selecting_word") throw new Error("Not in word selection phase");
        requireDrawer(room, params.playerId);

        const word = params.word.trim().toLowerCase();
        if (!word) throw new Error("Invalid word");
        if (!room.round.wordOptions.includes(word)) throw new Error("Selected word is not in options");

        clearRoundTimers(room);

        room.phase = "drawing";
        room.round.word = word;
        room.round.wordOptions = [];
        room.round.wordSelectEndsAt = null;

        room.round.mask = buildMask(word);
        room.round.endsAt = Date.now() + room.settings.roundDurationSec * 1000;

        setRoom(room.roomCode, room);
        GameGateway.roomState(room.roomCode, toPublicState(room));

        // Optional: hard reset canvas for everyone at start
        GameGateway.drawClear(room.roomCode);

        GameGateway.io().to(room.roomCode).emit("round:start", {
            roomCode: room.roomCode,
            drawerId: room.round.drawerId!,
            mask: room.round.mask,
            endsAt: room.round.endsAt!,
        });

        const durMs = room.settings.roundDurationSec * 1000;

        room.round.timers.hint1 = setTimeout(() => {
            const latest = getRoom(room.roomCode);
            if (!latest?.round.word || latest.phase !== "drawing") return;

            latest.round.mask = revealRandomLetter(latest.round.word, latest.round.mask);
            setRoom(latest.roomCode, latest);

            GameGateway.roundMask(latest.roomCode, latest.round.mask);
            GameGateway.roomState(latest.roomCode, toPublicState(latest));
        }, Math.floor(durMs * 0.5));

        room.round.timers.hint2 = setTimeout(() => {
            const latest = getRoom(room.roomCode);
            if (!latest?.round.word || latest.phase !== "drawing") return;

            latest.round.mask = revealRandomLetter(latest.round.word, latest.round.mask);
            setRoom(latest.roomCode, latest);

            GameGateway.roundMask(latest.roomCode, latest.round.mask);
            GameGateway.roomState(latest.roomCode, toPublicState(latest));
        }, Math.floor(durMs * 0.75));

        room.round.timers.roundEnd = setTimeout(() => {
            const latest = getRoom(room.roomCode);
            if (!latest?.round.word) return;
            if (latest.phase !== "drawing") return;
            try {
                RoomService.endRound({ roomCode: latest.roomCode, reason: "time" });
            } catch {
            }
        }, durMs);

        const drawer = room.players.find((p) => p.playerId === room.round.drawerId);
        if (drawer) {
            GameGateway.io().to(drawer.socketId).emit("round:word", {
                roomCode: room.roomCode,
                word: room.round.word,
            });
        }

        return { room, publicState: toPublicState(room) };
    },

    // ✅ Step 6: end round schedules next round / game end
    endRound(params: { roomCode: string; reason: "time" | "all_guessed" }) {
        const room = requireRoom(params.roomCode);
        if (!room.round.word) throw new Error("No active word");

        clearRoundTimers(room);

        room.phase = "round_end";
        setRoom(room.roomCode, room);

        GameGateway.roomState(room.roomCode, toPublicState(room));
        GameGateway.roundEnd(room.roomCode, room.round.word);

        // schedule next
        room.round.timers.nextRound = setTimeout(() => {
            const latest = getRoom(room.roomCode);
            if (!latest) return;
            if (latest.phase !== "round_end") return;

            try {
                RoomService.advanceGame(latest.roomCode);
            } catch {
            }
        }, ROUND_END_PAUSE_MS);

        return { room, publicState: toPublicState(room), word: room.round.word };
    },

    // ✅ Step 6: advance drawer/round or end game
    advanceGame(roomCode: string) {
        const room = requireRoom(roomCode);

        // If room too small, just end game
        if (room.players.length < 2) {
            room.phase = "game_end";
            setRoom(room.roomCode, room);
            GameGateway.roomState(room.roomCode, toPublicState(room));
            GameGateway.io().to(room.roomCode).emit("game:ended", {
                roomCode: room.roomCode,
                leaderboard: leaderboard(room),
            });
            return;
        }

        // Move to next drawer turn
        room.drawerIndex += 1;

        if (room.drawerIndex >= room.drawerOrder.length) {
            // completed a full cycle of drawers => next round
            room.drawerIndex = 0;
            room.currentRound += 1;

            if (room.currentRound > room.settings.maxRounds) {
                room.phase = "game_end";
                clearRoundTimers(room);
                setRoom(room.roomCode, room);

                GameGateway.roomState(room.roomCode, toPublicState(room));
                GameGateway.io().to(room.roomCode).emit("game:ended", {
                    roomCode: room.roomCode,
                    leaderboard: leaderboard(room),
                });
                return;
            }
        }

        // Ensure drawer exists (players may have left)
        const existingIds = new Set(room.players.map((p) => p.playerId));
        room.drawerOrder = room.drawerOrder.filter((id) => existingIds.has(id));
        if (room.drawerOrder.length === 0) room.drawerOrder = room.players.map((p) => p.playerId);
        room.drawerIndex = Math.min(room.drawerIndex, Math.max(0, room.drawerOrder.length - 1));

        RoomService.beginWordSelection(room);

        setRoom(room.roomCode, room);
        return room;
    },

    // drawing
    addStroke(params: {
        roomCode: string;
        playerId: string;
        strokeId: string;
        color: string;
        width: number;
        points: [number, number][];
    }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "drawing") throw new Error("Not in drawing phase");
        requireDrawer(room, params.playerId);

        const points = (params.points || []).slice(0, MAX_POINTS_PER_STROKE);
        if (points.length === 0) return null;

        const stroke: Stroke = {
            strokeId: params.strokeId,
            drawerId: params.playerId,
            color: params.color || "#000000",
            width: Math.max(1, Math.min(40, Number(params.width) || 4)),
            points,
            createdAt: Date.now(),
        };

        room.round.strokes.push(stroke);
        if (room.round.strokes.length > MAX_STROKES_PER_ROUND) {
            room.round.strokes.splice(0, room.round.strokes.length - MAX_STROKES_PER_ROUND);
        }

        setRoom(room.roomCode, room);
        GameGateway.drawStroke(room.roomCode, { roomCode: room.roomCode, ...stroke });
        return stroke;
    },

    clearCanvas(params: { roomCode: string; playerId: string }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "drawing") throw new Error("Not in drawing phase");
        requireDrawer(room, params.playerId);

        room.round.strokes = [];
        setRoom(room.roomCode, room);
        GameGateway.drawClear(room.roomCode);
        return true;
    },

    // ✅ Step 6: sync becomes phase-aware (and includes wordOptions only for drawer)
    getSyncState(params: { roomCode: string; playerId: string }) {
        const room = requireRoom(params.roomCode);
        const player = room.players.find((p) => p.playerId === params.playerId);

        const base = {
            roomCode: room.roomCode,
            phase: room.phase,
            currentRound: room.currentRound,
            drawerId: room.round.drawerId,
            mask: room.round.mask,
            endsAt: room.round.endsAt,
            wordSelectEndsAt: room.round.wordSelectEndsAt,
            strokes: room.round.strokes.map((s) => ({
                drawerId: s.drawerId,
                strokeId: s.strokeId,
                color: s.color,
                width: s.width,
                points: s.points,
                createdAt: s.createdAt,
            })),
        };

        if (room.phase === "selecting_word" && player && room.round.drawerId === player.playerId) {
            return { ...base, wordOptions: room.round.wordOptions };
        }
        return base;
    },

    // chat + guessing
    handleChatSend(params: { roomCode: string; playerId: string; text: string }) {
        const room = requireRoom(params.roomCode);
        const player = room.players.find((p) => p.playerId === params.playerId);
        if (!player) throw new Error("Player not found");

        const now = Date.now();

        if (player.lastChatAt && now - player.lastChatAt < CHAT_COOLDOWN_MS) return;
        player.lastChatAt = now;

        const text = (params.text || "").trim();
        if (!text) return;

        GameGateway.io().to(room.roomCode).emit("chat:message", {
            roomCode: room.roomCode,
            playerId: player.playerId,
            name: player.name,
            text,
            ts: now,
        });

        if (room.phase !== "drawing") return;
        if (room.round.drawerId === player.playerId) return;
        if (room.round.guessedPlayerIds.has(player.playerId)) return;

        const word = room.round.word;
        const endsAt = room.round.endsAt;
        if (!word || !endsAt) return;

        if (normalizeGuess(text) !== normalizeGuess(word)) return;

        const orderIndex = room.round.guessedPlayerIds.size;
        room.round.guessedPlayerIds.add(player.playerId);

        const points = calcGuessPoints({
            endsAt,
            now,
            roundDurationSec: room.settings.roundDurationSec,
            orderIndex,
        });
        player.score += points;

        const drawer = room.players.find((p) => p.playerId === room.round.drawerId);
        if (drawer) drawer.score += 25;

        setRoom(room.roomCode, room);

        GameGateway.io().to(room.roomCode).emit("guess:correct", {
            roomCode: room.roomCode,
            playerId: player.playerId,
            name: player.name,
            points,
        });

        GameGateway.io().to(room.roomCode).emit("score:update", {
            roomCode: room.roomCode,
            scores: room.players.map((p) => ({ playerId: p.playerId, score: p.score })),
        });

        GameGateway.roomState(room.roomCode, toPublicState(room));

        // early end if all non-drawers guessed
        const nonDrawers = room.players.filter((p) => p.playerId !== room.round.drawerId);
        const allGuessed =
            nonDrawers.length > 0 && nonDrawers.every((p) => room.round.guessedPlayerIds.has(p.playerId));

        if (allGuessed) {
            try {
                RoomService.endRound({ roomCode: room.roomCode, reason: "all_guessed" });
            } catch {
            }
        }
    },

    leaveRoom(params: { roomCode: string; playerId: string }) {
        const room = getRoom(params.roomCode);
        if (!room) return null;

        const idx = room.players.findIndex((p) => p.playerId === params.playerId);
        if (idx >= 0) room.players.splice(idx, 1);

        if (room.players.length === 0) {
            deleteRoom(room.roomCode);
            return null;
        }

        if (room.hostPlayerId === params.playerId) {
            const nextHost = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0];
            room.hostPlayerId = nextHost.playerId;
            room.players = room.players.map((p) => ({ ...p, isHost: p.playerId === nextHost.playerId }));
        }

        setRoom(room.roomCode, room);
        return { room, publicState: toPublicState(room) };
    },

    undoLastStroke(params: { roomCode: string; playerId: string }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "drawing") throw new Error("Not in drawing phase");
        requireDrawer(room, params.playerId);

        if (room.round.strokes.length === 0) return false;

        room.round.strokes.pop();
        setRoom(room.roomCode, room);

        // simplest: clear + replay everything
        GameGateway.drawClear(room.roomCode);
        for (const s of room.round.strokes) {
            GameGateway.drawStroke(room.roomCode, { roomCode: room.roomCode, ...s });
        }

        return true;
    },

    rematch(params: { roomCode: string; playerId: string; mode: "fresh" | "same_settings" }) {
        const room = requireRoom(params.roomCode);
        if (room.phase !== "game_end") throw new Error("Rematch allowed only after game ends");
        requireHost(room, params.playerId);

        clearRoundTimers(room);

        const keepSettings = { ...room.settings };

        room.phase = "lobby";
        room.currentRound = 0;
        room.drawerIndex = 0;
        room.round = createEmptyRound();
        room.settings = keepSettings;

        room.players = room.players.map((p) => ({
            ...p,
            score: 0,
            isReady: params.mode === "same_settings" ? !p.isHost : false,
        }));

        room.drawerOrder = room.players.map((p) => p.playerId);
        room.drawerIndex = 0;

        setRoom(room.roomCode, room);
        GameGateway.roomState(room.roomCode, toPublicState(room));

        return { room, publicState: toPublicState(room) };
    },

    markDisconnectedBySocket(socketId: string) {
        for (const [roomCode, room] of roomStore.entries()) {
            const p = room.players.find((x) => x.socketId === socketId);
            if (!p) continue;

            p.isConnected = false;
            setRoom(roomCode, room);

            GameGateway.roomState(roomCode, toPublicState(room));
            return { roomCode, publicState: toPublicState(room) };
        }
        return null;
    },
};
