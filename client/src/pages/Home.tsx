import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {socket} from "../socket/socket.ts";
import {useGameStore} from "../store/useGameStore.ts";

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
        <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-xl bg-zinc-900/60 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white/80 text-xl">Skribble</CardTitle>
                    <div className="text-sm text-zinc-400">Create or join a room to start drawing.</div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300">Your name</div>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Yash"
                            className="bg-zinc-950/40 text-white/90 border-zinc-800"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button className={"border border-white/50"} onClick={onCreate} disabled={!canProceed}>
                            Create room
                        </Button>
                        <Button variant="secondary" onClick={onJoin} disabled={!canProceed || !joinCode.trim()}>
                            Join room
                        </Button>
                    </div>

                    <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Room code (for join)"
                        className="bg-zinc-950/40 text-white/90 border-zinc-800"
                    />

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">
                            {error}
                        </div>
                    )}

                    {/*<div className="text-xs text-zinc-500">*/}
                    {/*    Tip: In production, you’ll show reconnect flow if user refreshes.*/}
                    {/*</div>*/}
                </CardContent>
            </Card>
        </div>
    );
}
