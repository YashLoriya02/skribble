import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../../socket/socket";
import { useGameStore } from "../../store/useGameStore";
import CustomSelect from "./CustomSelect";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

function normalizeCustomWords(raw: string) {
    const words = raw
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean)
        .map((w) => w.replace(/\s+/g, " "));

    const cleaned = words
        .filter((w) => w.length >= 2 && w.length <= 30)
        .slice(0, 250);

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const w of cleaned) {
        const key = w.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(w);
    }
    return unique;
}

export default function LobbySettings() {
    const { publicState, roomCode, playerId } = useGameStore();

    const isHost = useMemo(
        () => publicState?.hostPlayerId === playerId,
        [publicState?.hostPlayerId, playerId]
    );

    const shouldRender = !!publicState && publicState.phase === "lobby" && isHost;

    const rounds = publicState?.settings?.maxRounds ?? 3;
    const drawTime = publicState?.settings?.roundDurationSec ?? 80;
    const maxPlayers = publicState?.settings?.maxPlayers ?? 2;
    const serverCustomWords = publicState?.settings?.customWords ?? [];

    const [players, setPlayers] = useState<number>(maxPlayers);
    const [customWordsText, setCustomWordsText] = useState<string>(
        serverCustomWords.join(", ")
    );

    const typingRef = useRef(false);
    const lastServerWordsRef = useRef<string>(serverCustomWords.join(", "));

    const update = (settings: Partial<{
        maxRounds: number;
        roundDurationSec: number;
        maxPlayers: number;
        customWords: string[];
    }>) => {
        if (!roomCode || !playerId) return;
        socket.emit("room:updateSettings", { roomCode, playerId, settings });
    };

    useEffect(() => {
        setPlayers(maxPlayers);
    }, [maxPlayers]);

    useEffect(() => {
        const next = serverCustomWords.join(", ");
        const prev = lastServerWordsRef.current;
        if (next === prev) return;

        lastServerWordsRef.current = next;

        if (!typingRef.current) {
            setCustomWordsText(next);
        }
    }, [serverCustomWords]);

    useEffect(() => {
        if (!shouldRender) return;

        const id = window.setTimeout(() => {
            const words = normalizeCustomWords(customWordsText);
            update({ customWords: words });
            typingRef.current = false;
        }, 450);

        return () => window.clearTimeout(id);
    }, [customWordsText, shouldRender]);

    const parsed = useMemo(
        () => normalizeCustomWords(customWordsText),
        [customWordsText]
    );

    if (!shouldRender) return null;

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm text-zinc-200 font-semibold mb-3">Host Controls</div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Max Players</div>
                    <Input
                        value={players}
                        type="number"
                        min={2}
                        max={12}
                        onChange={(e) => {
                            const v = Math.max(2, Math.min(12, Number(e.target.value) || 2));
                            setPlayers(v);
                            update({ maxPlayers: v });
                        }}
                        className="bg-zinc-950/40 text-white/90 appearance-none border-zinc-800"
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Rounds</div>
                    <CustomSelect
                        value={rounds}
                        onChange={(v) => update({ maxRounds: v })}
                        options={[1, 3, 5, 7].map((v) => ({ value: v, label: String(v) }))}
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Draw time (sec)</div>
                    <CustomSelect
                        value={drawTime}
                        onChange={(v) => update({ roundDurationSec: v })}
                        options={[60, 80, 100].map((v) => ({ value: v, label: `${v} sec` }))}
                    />
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                        Custom Words <span className="text-zinc-500">(comma separated)</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                        {parsed.length} word{parsed.length === 1 ? "" : "s"} (max 250)
                    </div>
                </div>

                <Textarea
                    value={customWordsText}
                    onChange={(e) => {
                        typingRef.current = true;
                        setCustomWordsText(e.target.value);
                    }}
                    onBlur={() => {
                        typingRef.current = false;
                    }}
                    placeholder="pizza, space ship, umbrella, iron man, cricket..."
                    className="w-full min-h-22.5 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-white/90 outline-none"
                />

                <div className="text-[11px] tracking-wide ml-1 -mt-1 text-zinc-500">
                    Tip: multi-word phrases are allowed (e.g., “cruise ship”).
                </div>
            </div>
        </div>
    );
}
