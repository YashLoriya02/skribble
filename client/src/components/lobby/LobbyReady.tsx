import {socket} from "../../socket/socket";
import {useGameStore} from "../../store/useGameStore";

export default function LobbyReadyPanel({isGame}: { isGame: boolean }) {
    const {publicState, roomCode, playerId} = useGameStore();

    const isLobby = publicState?.phase === "lobby";
    if (!isLobby || !publicState) return null;

    const isHost = publicState.hostPlayerId === playerId;

    const me = publicState.players.find((p) => p.playerId === playerId);
    const myReady = !!me?.isReady;

    const toggleReady = () => {
        if (!roomCode || !playerId) return;
        socket.emit("lobby:ready", {roomCode, playerId, isReady: !myReady});
    };

    const start = () => {
        if (!roomCode || !playerId) return;
        socket.emit("game:start", {roomCode, playerId});
    };

    const allReady = publicState.players.every((p) => p.isHost || p.isReady)

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm text-zinc-200 font-semibold">Lobby</div>
                    <div className="text-xs text-zinc-400">Get ready to start the match</div>
                </div>

                <div className="flex gap-2">
                    {isHost
                        ? <button
                            onClick={start}
                            disabled={publicState.players.length < 2 || !allReady}
                            className="px-3 py-2 text-sm rounded-md border border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Start Game
                        </button>
                        : <button
                            onClick={toggleReady}
                            className={`px-3 py-2 text-sm rounded-md border ${
                                myReady
                                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                                    : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                            }`}
                        >
                            {myReady ? "Ready ✓" : "I'm Ready"}
                        </button>
                    }
                </div>
            </div>

            <div className={`grid grid-cols-1 ${isGame ? "mt-5 gap-4" : "mt-3 md:grid-cols-2 gap-2"}`}>
                {publicState.players.map((p) => (
                    <div key={p.playerId}
                         className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div className="text-sm text-zinc-100">
                            {p.name} {p.isHost ? <span className="text-xs text-zinc-400">(host)</span> : null}
                        </div>
                        <div
                            className={`text-xs ${p.isHost ? "text-zinc-400" : p.isReady ? "text-emerald-300" : "text-zinc-500"}`}>
                            {p.isHost ? "Host" : p.isReady ? "Ready" : "Not ready"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
