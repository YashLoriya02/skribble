import { useMemo, useRef, useEffect, useState } from "react";
import { socket } from "../../socket/socket";
import { useGameStore } from "../../store/useGameStore";

export default function ChatPanel() {
    const { roomCode, playerId, chat, publicState } = useGameStore();
    const [text, setText] = useState("");

    const isDrawer = useMemo(() => {
        const drawerId = publicState?.round.drawerId;
        return !!drawerId && drawerId === playerId;
    }, [publicState, playerId]);

    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [chat.length]);

    const send = () => {
        const t = text.trim();
        if (!t || !roomCode || !playerId) return;
        socket.emit("chat:send", { roomCode, playerId, text: t });
        setText("");
    };

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-sm text-zinc-300 mb-2">Chat {isDrawer ? "(you can chat but can’t guess)" : ""}</div>

            <div ref={listRef} className="h-[360px] overflow-auto rounded-lg border border-zinc-800 bg-black/20 p-2 space-y-2">
                {chat.map((m, idx) => (
                    <div key={`${m.ts}_${idx}`} className="text-sm">
                        <span className="text-zinc-400">{m.name}: </span>
                        <span className="text-zinc-100">{m.text}</span>
                    </div>
                ))}
                {chat.length === 0 ? <div className="text-sm text-zinc-500">No messages yet…</div> : null}
            </div>

            <div className="mt-3 flex gap-2">
                <input
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm outline-none"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your guess…"
                    onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button
                    className="px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                    onClick={send}
                    disabled={!text.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
