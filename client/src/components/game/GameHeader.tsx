import {useMemo} from "react";
import {useGameStore} from "../../store/useGameStore";
import TimerRing from "./TimerRing.tsx";

export default function GameHeader() {
    const {
        publicState,
        playerId,
        drawerWord,
        lastRoundWord,
    } = useGameStore();

    const phase = publicState?.phase;

    const isDrawer = useMemo(
        () => publicState?.round.drawerId === playerId,
        [publicState, playerId]
    );

    const drawerName =
        publicState?.players?.find((p) => p.playerId === publicState?.round.drawerId)?.name || "Drawer";

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm text-zinc-400">
                        Round <span className="text-zinc-100">{publicState?.currentRound ?? 0}</span> /{" "}
                        <span className="text-zinc-100">{publicState?.settings.maxRounds ?? 0}</span>
                    </div>

                    <div className="text-sm md:text-lg font-semibold">
                        {phase === "drawing" ? (
                            <>
                                {isDrawer && drawerWord
                                    ? <div className="mt-1 text-emerald-300">
                                        <span className="font-semibold tracking-widest uppercase">{drawerWord}</span>
                                    </div>
                                    : <span className="tracking-widest">{publicState?.round.mask || ""}</span>
                                }
                            </>
                        ) : phase === "selecting_word" ? (
                            <span className="text-zinc-200">
                                {isDrawer ? "Pick a word to draw…" : `${drawerName} is picking a word…`}
                            </span>
                        ) : phase === "round_end" ? (
                            <span className="text-zinc-200">
                                Round ended{" "}
                                {lastRoundWord ? (
                                    <span className="text-amber-300">(Word: {lastRoundWord.toUpperCase()})</span>
                                ) : null}
                            </span>
                        ) : phase === "game_end" ? (
                            <span className="text-zinc-200">
                                Game ended{" "}
                                {lastRoundWord ? (
                                    <span className="text-amber-300">(Last word: {lastRoundWord.toUpperCase()})</span>
                                ) : null}
                            </span>
                        ) : (
                            <span className="text-zinc-200">Lobby</span>
                        )}
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-end">
                    <TimerRing/>
                </div>

                <div className="flex md:hidden items-center justify-end">
                    <TimerRing size={40}/>
                </div>
            </div>
        </div>
    );
}
