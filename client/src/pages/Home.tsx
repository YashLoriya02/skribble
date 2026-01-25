import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {socket} from "../socket/socket.ts";
import {useGameStore} from "../store/useGameStore.ts";
import {toast} from "sonner";

export default function Home() {
    const nav = useNavigate();
    const {name, setName, ensurePlayerId, setRoomCode, error, setError} = useGameStore();

    const [joinCode, setJoinCode] = useState("");

    const canProceed = useMemo(() => name.trim().length >= 2, [name]);

    const connectIfNeeded = () => {
        if (!socket.connected) socket.connect();
    };

    const onCreate = () => {
        setError(null);
        if (!canProceed) return;
        const playerId = ensurePlayerId();
        connectIfNeeded();
        socket.emit("room:create", {name: name.trim(), playerId});
        nav("/lobby");
    };

    const onJoin = () => {
        setError(null);
        if (!canProceed || !joinCode.trim()) return;
        const playerId = ensurePlayerId();
        const roomCode = joinCode.trim().toUpperCase();
        setRoomCode(roomCode);
        connectIfNeeded();
        socket.emit("room:join", {roomCode, name: name.trim(), playerId});
        nav("/lobby");
    };

    return (
        <div className="min-h-screen h-full flex items-center justify-center">
            <Card className="w-[90%] md:w-full pt-6 max-w-2xl bg-zinc-900/60 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white/80 text-2xl">Skribble</CardTitle>
                    <div className="text-sm text-zinc-400">Create or join a room to start the game.</div>
                </CardHeader>

                <CardContent className="space-y-4 mb-6">
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300">What will other's call you?</div>
                        <Input
                            value={name}
                            onChange={(e) => {
                                if (e.target.value.length > 12) {
                                    toast.error("Select the name with less than 12 characters")
                                } else {
                                    setName(e.target.value)
                                }
                            }}
                            placeholder="Give some funny name"
                            className="bg-zinc-950/40 text-white/90 border-zinc-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300">Do you have any friend?</div>
                        <Input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Room code (for join)"
                            className="bg-zinc-950/40 text-white/90 border-zinc-800"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button className={"border border-white/10"} onClick={onCreate} disabled={!canProceed}>
                            Create room
                        </Button>
                        <Button variant="secondary" onClick={onJoin} disabled={!canProceed || !joinCode.trim()}>
                            Join room
                        </Button>
                    </div>

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
