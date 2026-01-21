import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { socket } from "../../socket/socket";

export default function GameHeader() {
    const { publicState, playerId, roomCode, wordOptions, setWordOptions } = useGameStore();
    const phase = publicState?.phase;

    const isDrawer = useMemo(() => publicState?.round.drawerId === playerId, [publicState, playerId]);

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(t);
    }, []);

    const endsAt =
        phase === "selecting_word" ? publicState?.round.wordSelectEndsAt : publicState?.round.endsAt;

    const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;

    const onSelectWord = (w: string) => {
        if (!roomCode || !playerId) return;
        socket.emit("round:selectWord", { roomCode, playerId, word: w });
        setWordOptions(null);
    };

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
            <div className="text-sm text-zinc-400">
            Round <span className="text-zinc-100">{publicState?.currentRound ?? 0}</span> /{" "}
    <span className="text-zinc-100">{publicState?.settings.maxRounds ?? 0}</span>
    </div>
    <div className="text-lg font-semibold">
    {phase === "drawing" ? (
        <span className="tracking-widest">{publicState?.round.mask || ""}</span>
) : phase === "selecting_word" ? (
        <span className="text-zinc-200">Drawer choosing a word…</span>
) : phase === "round_end" ? (
        <span className="text-zinc-200">Round ended</span>
) : phase === "game_end" ? (
        <span className="text-zinc-200">Game ended</span>
) : (
        <span className="text-zinc-200">Lobby</span>
    )}
    </div>
    </div>

    <div className="text-right">
    <div className="text-sm text-zinc-400">Timer</div>
        <div className="text-2xl font-bold tabular-nums">{secondsLeft ?? "--"}</div>
    </div>
    </div>

    {phase === "selecting_word" && isDrawer && wordOptions?.options?.length ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-black/20 p-3">
        <div className="text-sm text-zinc-300 mb-2">Pick a word</div>
    <div className="flex flex-wrap gap-2">
        {wordOptions.options.map((w) => (
                <button
                    key={w}
            onClick={() => onSelectWord(w)}
        className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-sm"
            >
            {w}
            </button>
    ))}
        </div>
        </div>
    ) : null}
    </div>
);
}
