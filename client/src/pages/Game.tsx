import {useEffect, useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {socket} from "../socket/socket";
import {useGameStore} from "../store/useGameStore";
import CanvasBoard from "../components/game/CanvasBoard";
import ChatPanel from "../components/game/ChatPanel";
import GameHeader from "../components/game/GameHeader";
import {toast} from "sonner";
import {Copy} from "lucide-react";

export default function Game() {
    const nav = useNavigate();
    const {roomCode, ensurePlayerId, publicState, resetRoom} = useGameStore();

    useEffect(() => {
        const playerId = ensurePlayerId();
        if (!socket.connected) socket.connect();

        if (roomCode && playerId) {
            socket.emit("reconnect:hello", {roomCode, playerId});
            socket.emit("sync:request", {roomCode, playerId});
        }
    }, [roomCode, ensurePlayerId]);

    const leave = () => {
        const pid = useGameStore.getState().playerId;
        if (roomCode && pid) socket.emit("room:leave", {roomCode, playerId: pid});
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

    return (
        <div className="min-h-screen p-3 md:p-6 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm flex items-center gap-4 text-zinc-400">
                    <div className="ml-2">
                        Room: <span className="font-mono text-zinc-200">{roomCode}</span>
                    </div>
                    <button onClick={copyCode}
                            className="flex bg-white/10 text-white/70 cursor-pointer px-4 py-1 gap-2 justify-center items-center rounded-lg">
                        <Copy className={"h-3.5 w-3.5"}/>
                        Invite
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                        onClick={leave}
                    >
                        Leave
                    </button>
                </div>
            </div>

            <GameHeader/>

            <div className="gap-4 w-full">
                <div className="flex flex-col md:flex-row justify-between h-full gap-4 w-full">
                    <div
                        className="rounded-xl border hidden md:block w-1/5 h-full overflow-y-auto border-zinc-800 bg-zinc-950/40 p-3">
                        <div className="text-sm text-zinc-300 mb-2">Scores</div>
                        <hr className={"py-2 "}/>
                        <div className="space-y-2">
                            {sortedPlayers.map((p) => (
                                <div key={p.playerId} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-200">{p.name}</span>
                                    <span className="tabular-nums text-zinc-100">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full md:w-2/3">
                        <CanvasBoard/>
                    </div>

                    <div className="h-full w-full md:w-1/3 flex gap-2">
                        <div
                            className="rounded-xl border md:hidden w-1/2 h-full overflow-y-auto border-zinc-800 bg-zinc-950/40 p-3">
                            <div className="text-sm text-zinc-300 mb-2">Scores</div>
                            <hr className="py-2"/>
                            <div className="space-y-2">
                                {sortedPlayers.map((p) => (
                                    <div key={p.playerId} className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-200">{p.name}</span>
                                        <span className="tabular-nums text-zinc-100">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <ChatPanel/>
                    </div>

                </div>
            </div>

            {/*{*/}
            {/*    phase === "game_end" && leaderboard ? (*/}
            {/*        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">*/}
            {/*            <div className="text-lg font-semibold mb-2">Leaderboard</div>*/}
            {/*            <div className="space-y-2">*/}
            {/*                {leaderboard.map((p, idx) => (*/}
            {/*                    <div key={p.playerId} className="flex items-center justify-between">*/}
            {/*    <span className="text-zinc-200">*/}
            {/*      #{idx + 1} {p.name}*/}
            {/*    </span>*/}
            {/*                        <span className="tabular-nums text-zinc-100">{p.score}</span>*/}
            {/*                    </div>*/}
            {/*                ))}*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    ) : null*/}
            {/*}*/}
        </div>
    )
        ;
}
