import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useGameStore} from "../store/useGameStore";
import {socket} from "../socket/socket";

import {Button} from "../components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Badge} from "../components/ui/badge";
import {Copy} from "lucide-react";
import {toast} from "sonner";
import LobbySettings from "../components/lobby/LobbySettings.tsx";

export default function Lobby() {
    const nav = useNavigate();
    const {roomCode, playerId, ensurePlayerId, publicState, error, setError, resetRoom} = useGameStore();

    useEffect(() => {
        if (publicState?.phase && publicState.phase !== "lobby") {
            nav("/game");
        }
    }, [publicState?.phase, nav]);

    useEffect(() => {
        // if user directly lands on lobby, ensure socket is ready & attempt reconnect
        const pid = ensurePlayerId();
        if (!socket.connected) socket.connect();

        if (roomCode && pid) {
            socket.emit("reconnect:hello", {roomCode, playerId: pid});
            socket.emit("sync:request", {roomCode, playerId: pid});
        }
    }, [roomCode, ensurePlayerId]);

    const players: any[] = publicState?.players ?? [];
    const me = players.find((p) => p.playerId === playerId);
    const isHost = publicState?.hostPlayerId === playerId;

    const toggleReady = () => {
        setError(null);
        if (!roomCode || !playerId) return;
        socket.emit("lobby:ready", {roomCode, playerId, isReady: !me?.isReady});
    };

    const startGame = () => {
        setError(null);
        if (!roomCode || !playerId) return;
        socket.emit("game:start", {roomCode, playerId});
        // nav("/game");
    };

    const leave = () => {
        if (roomCode && playerId) socket.emit("room:leave", {roomCode, playerId});
        resetRoom();
        nav("/");
    };

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
        <div className="min-h-screen p-6 flex items-center justify-center">
            <Card className="w-full max-w-2xl bg-zinc-900/60 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white/80 text-xl">Lobby</CardTitle>
                        <div className="text-sm flex items-center gap-3 text-zinc-400">
                            Room: <span className="font-mono text-zinc-200">{roomCode || "—"}</span>
                            <button onClick={copyCode}
                                    className="flex bg-white/10 text-white/70 cursor-pointer px-4 py-1 gap-2 justify-center items-center rounded-lg">
                                <Copy className={"h-3.5 w-3.5"}/>
                                Invite
                            </button>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={leave}>
                        Leave
                    </Button>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <div className="text-sm text-zinc-300">Players</div>
                        <div className="space-y-2">
                            {players.length === 0 ? (
                                <div className="text-sm text-zinc-500">Waiting for players…</div>
                            ) : (
                                players.map((p) => (
                                    <div
                                        key={p.playerId}
                                        className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-zinc-100">{p.name}</span>
                                            {p.playerId === playerId && <Badge variant="secondary">You</Badge>}
                                            {p.isHost && <Badge>Host</Badge>}
                                        </div>
                                        <Badge
                                            variant={p.isReady ? "default" : "secondary"}>{p.isReady ? "Ready" : "Not ready"}</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {
                            isHost ?
                                <Button onClick={startGame} disabled={!roomCode}>
                                    Start Game
                                </Button>
                                : <Button onClick={toggleReady} disabled={!roomCode}>
                                    {me?.isReady ? "Unready" : "Ready"}
                                </Button>
                        }
                    </div>

                    <LobbySettings />

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
