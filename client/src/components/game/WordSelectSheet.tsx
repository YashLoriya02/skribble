import {useEffect, useMemo, useState} from "react";
import {socket} from "../../socket/socket";
import {useGameStore} from "../../store/useGameStore";

export default function WordSelectSheet() {
    const {publicState, roomCode, playerId, wordOptions, setWordOptions} = useGameStore();

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(t);
    }, []);

    const phase = publicState?.phase;
    const drawerId = publicState?.round.drawerId;

    const isDrawer = useMemo(() => drawerId && drawerId === playerId, [drawerId, playerId]);

    const drawerName =
        publicState?.players?.find((p) => p.playerId === drawerId)?.name || "Drawer";

    const endsAt =
        phase === "selecting_word" ? publicState?.round.wordSelectEndsAt : publicState?.round.endsAt;

    const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;

    const canShow = phase === "selecting_word";
    if (!canShow) return null;

    const onSelectWord = (w: string) => {
        if (!roomCode || !playerId) return;
        socket.emit("round:selectWord", {roomCode, playerId, word: w});
        setWordOptions(null);
    };

    return (
        <div className="absolute inset-0 z-20 flex items-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"/>

            <div
                className={`relative max-w-[90%] md:max-w-[50%] sm:w-fit md:w-[500px] m-auto rounded-2xl bg-zinc-900/70 backdrop-blur-xl shadow-[0px_0px_30px_rgba(255,255,255,0.25)] ${isDrawer ? "pb-8 pt-4" : ""} px-8 animate-sheetUp`}>
                {!isDrawer ? (
                    <div className="py-8 px-10 text-center">
                        <div className="text-lg md:text-2xl text-zinc-300">{drawerName} is picking a word…</div>
                        <div className="mt-5 flex justify-center">
                            <div
                                className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin"/>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20"/>

                        <div className="py-3 text-center">
                            <div className="text-lg md:text-2xl text-zinc-200 font-medium">Pick a word to draw</div>
                            <div className="text-sm md:text-base text-zinc-400 mt-0.5">
                                Choose fast or else it will auto-pick in
                                <span className={"text-zinc-200 ml-1.5 font-bold"}>{secondsLeft}s</span>.
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                            {(wordOptions?.options || []).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => onSelectWord(w)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 active:scale-[0.99] px-4 py-3 text-lg font-semibold tracking-wide text-white transition duration-300"
                                >
                                    {w}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
