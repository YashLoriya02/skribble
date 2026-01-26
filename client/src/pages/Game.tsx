import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import { useGameStore } from "../store/useGameStore";
import CanvasBoard from "../components/game/CanvasBoard";
import ChatPanel from "../components/game/ChatPanel";
import GameHeader from "../components/game/GameHeader";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { SoundToggle } from "../components/SoundToggle.tsx";
import LobbySettings from "../components/lobby/LobbySettings.tsx";
import LobbyReadyPanel from "../components/lobby/LobbyReady.tsx";
import WinnerCelebration from "../components/game/GameCelebration.tsx";

export default function Game() {
    const nav = useNavigate();
    const { leaderboard, showCelebration, roomCode, ensurePlayerId, publicState, resetRoom } = useGameStore();

    const top3 = (leaderboard || []).slice(0, 3);
    const winner = top3[0];

    useEffect(() => {
        const playerId = ensurePlayerId();
        if (!socket.connected) socket.connect();

        if (roomCode && playerId) {
            socket.emit("reconnect:hello", { roomCode, playerId });
            socket.emit("sync:request", { roomCode, playerId });
        }
    }, [roomCode, ensurePlayerId]);

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

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);

            toast.success("Room Code Copied!");
        } catch (e) {
            console.log("Error in copying room code", e)
            toast.error("Please try again later");
        }
    }

    const phase = publicState?.phase;
    const isLobby = phase === "lobby";

    return (
        <div className="h-screen flex flex-col p-2 md:p-4 gap-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div className="text-sm flex items-center gap-4 text-zinc-400">
                    <div className="ml-2">
                        Room: <span className="font-mono text-zinc-200">{roomCode}</span>
                    </div>
                    <button
                        onClick={copyCode}
                        className="flex bg-white/10 text-white/70 cursor-pointer px-3 py-1 gap-2 justify-center items-center rounded-lg"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Invite
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <SoundToggle />
                    <button
                        className="px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                        onClick={leave}
                    >
                        Leave
                    </button>
                </div>
            </div>

            <GameHeader />

            {
                isLobby ? (
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
                        <div
                            className="w-full md:w-1/3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 overflow-hidden">
                            <div className="text-sm text-zinc-300 mb-2">Players</div>
                            <hr className="mb-2" />
                            <div className="flex-1 overflow-auto space-y-2">
                                {publicState?.players?.map((p) => (
                                    <div key={p.playerId} className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-200">
                                            {p.name} {p.isHost ? <span className="text-xs text-zinc-400">(host)</span> : null}
                                        </span>
                                        <span
                                            className={`text-xs ${p.isHost ? "text-zinc-400" : p.isReady ? "text-emerald-300" : "text-zinc-500"}`}>
                                            {p.isHost ? "Host" : p.isReady ? "Ready" : "Not ready"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col gap-3">
                            <LobbySettings />
                            <LobbyReadyPanel isGame={true} />
                        </div>
                    </div>
                ) : <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
                    <div
                        className="hidden md:flex flex-col w-1/5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 overflow-hidden">
                        <div className="text-sm text-zinc-300 mb-2 shrink-0">Scores</div>
                        <hr className="mb-2" />
                        <div className="flex-1 overflow-auto space-y-2">
                            {sortedPlayers.map((p) => (
                                <div key={p.playerId} className="flex justify-between text-sm">
                                    <span className="text-zinc-200">{p.name}</span>
                                    <span className="tabular-nums text-zinc-100">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex">
                        <CanvasBoard />
                    </div>

                    <div className="flex w-full md:w-1/3 min-h-0 gap-3">
                        <div
                            className="md:hidden w-[40%] rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 overflow-hidden">
                            <div className="text-sm text-zinc-300 mb-2">Scores</div>
                            <hr className="mb-2" />
                            <div className="max-h-30 overflow-auto space-y-2">
                                {sortedPlayers.map((p) => (
                                    <div key={p.playerId} className="flex justify-between text-sm">
                                        <span className="text-zinc-200">{p.name}</span>
                                        <span className="tabular-nums text-zinc-100">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-[60%] md:w-full min-h-0">
                            <ChatPanel />
                        </div>

                        <WinnerCelebration open={showCelebration} top3={top3} winner={winner} />
                    </div>
                </div>
            }
        </div>
    );
}
