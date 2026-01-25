import {useEffect, useRef, useState} from "react";
import {socket} from "../../socket/socket";
import {useGameStore} from "../../store/useGameStore";

export default function ChatPanel() {
    const {roomCode, playerId, chat} = useGameStore();
    const [text, setText] = useState("");

    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [chat.length]);

    const send = () => {
        const t = text.trim();
        if (!t || !roomCode || !playerId) return;
        socket.emit("chat:send", {roomCode, playerId, text: t});
        setText("");
    };

    return (
        <div className="rounded-xl w-[55%] md:w-full h-[360px] md:h-[580px] border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-sm text-zinc-300 mb-2">Chat</div>

            <div className="h-full flex flex-col justify-between">
                <div
                    ref={listRef}
                    className="overflow-y-auto no-scrollbar h-full rounded-lg border border-zinc-800 bg-black/20 p-2 space-y-2"
                >
                    {chat.map((m, idx) => {
                        if (m.type === "correct") {
                            return (
                                <div
                                    key={`${m.ts}_${idx}`}
                                    className="rounded-md animate-in fade-in zoom-in duration-300 bg-green-500/15 border border-green-500/30 px-2 py-1.5 text-[10px] text-wrap md:text-sm text-green-300"
                                >
                                    ✅ {m.text}
                                </div>
                            );
                        }

                        if (m.type === "reveal") {
                            return (
                                <div
                                    key={`${m.ts}_${idx}`}
                                    className="rounded-md text-wrap animate-in fade-in zoom-in duration-300 px-2.5 text-[10px] md:text-sm text-emerald-300 font-medium"
                                >
                                    🎯 {m.text}
                                </div>
                            );
                        }

                        return (
                            <div key={`${m.ts}_${idx}`} className="text-[10px] text-wrap px-3 md:text-sm">
                                <span className="text-zinc-400">{m.name}: </span>
                                <span className="text-zinc-100">{m.text}</span>
                            </div>
                        );
                    })}
                    {chat.length === 0 ? <div className="text-sm text-zinc-500">No messages yet…</div> : null}
                </div>

                <div className="w-full flex flex-col gap-3 mb-8">
                    <input
                        className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm outline-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type your guess…"
                        onKeyDown={(e) => e.key === "Enter" && send()}
                    />
                    {/*<button*/}
                    {/*    className="hidden md:block px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"*/}
                    {/*    onClick={send}*/}
                    {/*    disabled={!text.trim()}*/}
                    {/*>*/}
                    {/*    Send*/}
                    {/*</button>*/}
                </div>
            </div>
        </div>
    );
}
