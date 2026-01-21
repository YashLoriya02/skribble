import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import { useGameStore } from "../store/useGameStore";
import CanvasBoard from "../components/game/CanvasBoard";
import ChatPanel from "../components/game/ChatPanel";
import GameHeader from "../components/game/GameHeader";

export default function Game() {
    const nav = useNavigate();
    const { roomCode, ensurePlayerId, publicState, resetRoom, leaderboard } = useGameStore();

    useEffect(() => {
        const playerId = ensurePlayerId();
        if (!socket.connected) socket.connect();

        if (roomCode && playerId) {
            socket.emit("reconnect:hello", { roomCode, playerId });
            socket.emit("sync:request", { roomCode, playerId });
        }
    }, [roomCode, ensurePlayerId]);

    const phase = publicState?.phase;

    const leave = () => {
        const pid = useGameStore.getState().playerId;
        if (roomCode && pid) socket.emit("room:leave", { roomCode, playerId: pid });
        resetRoom();
        nav("/");
    };

    const sortedPlayers = useMemo(() => {
        const ps = publicState?.players || [];
        return [...ps].sort((a, b) => b.score - a.score);
    }, [publicState]);

    return (
        <div className="min-h-screen p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                    Room: <span className="font-mono text-zinc-200">{roomCode}</span>
                </div>
                <button
                    className="px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                    onClick={leave}
                >
                    Leave
                </button>
            </div>

            <GameHeader />

            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                <CanvasBoard />
                <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                        <div className="text-sm text-zinc-300 mb-2">Scores</div>
                        <div className="space-y-2">
                            {sortedPlayers.map((p) => (
                                <div key={p.playerId} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-200">{p.name}</span>
                                    <span className="tabular-nums text-zinc-100">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <ChatPanel />
                </div>
            </div>

            {phase === "game_end" && leaderboard ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <div className="text-lg font-semibold mb-2">Leaderboard</div>
                    <div className="space-y-2">
                        {leaderboard.map((p, idx) => (
                            <div key={p.playerId} className="flex items-center justify-between">
                <span className="text-zinc-200">
                  #{idx + 1} {p.name}
                </span>
                                <span className="tabular-nums text-zinc-100">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
