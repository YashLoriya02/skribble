import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../../socket/socket";
import { useGameStore } from "../../store/useGameStore";
import { SFX } from "../../audio/sound";

export default function LeaderboardModal() {
    const { publicState, leaderboard, roomCode, playerId, setLeaderboard } = useGameStore();

    const isOpen = !!leaderboard?.length && publicState?.phase === "game_end";
    const isHost = publicState?.hostPlayerId === playerId;

    const [countdown, setCountdown] = useState(10);
    const [showPodium, setShowPodium] = useState(false);

    const playedRef = useRef(false);

    const top = useMemo(() => {
        const lb = leaderboard || [];
        return { first: lb[0], second: lb[1], third: lb[2] };
    }, [leaderboard]);

    useEffect(() => {
        if (!isOpen) {
            setCountdown(5);
            setShowPodium(false);
            playedRef.current = false;
            return;
        }

        if (!playedRef.current) {
            playedRef.current = true;
        }

        setCountdown(5);
        setShowPodium(false);

        const t = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(t);
                    setShowPodium(true);
                    SFX.play("gameEnd");
                    return 0;
                }

                return c - 1;
            });
        }, 1000);

        return () => clearInterval(t);
    }, [isOpen]);

    const rematch = (mode: "fresh" | "same_settings") => {
        if (!roomCode || !playerId) return;
        socket.emit("game:rematch", { roomCode, playerId, mode });
        setLeaderboard(null as any);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/10 backdrop-blur-sm p-4">
            <div
                className={`${showPodium ? "w-full" : "w-100"}  max-w-170 rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.6)] p-5`}>
                {!showPodium ? (
                    <div className="py-2 text-center">
                        <div className="text-base md:text-xl md:tracking-wide font-bold text-zinc-400">Final results in</div>
                        <div className="mt-2 text-5xl font-extrabold text-white tabular-nums">
                            0{countdown}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm text-zinc-400">Game Finished</div>
                                <div className="text-2xl font-semibold text-white">
                                    Winner: <span className="text-emerald-300">{top.first?.name ?? "—"}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-zinc-400">Room</div>
                                <div className="font-mono text-zinc-200">{roomCode}</div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-end justify-center gap-4">
                            <PodiumCard place="3rd" medal="🥉" name={top.third?.name} score={top.third?.score}
                                heightClass="h-[130px]" />
                            <PodiumCard place="1st" medal="🥇" name={top.first?.name} score={top.first?.score}
                                heightClass="h-[170px]" highlight />
                            <PodiumCard place="2nd" medal="🥈" name={top.second?.name} score={top.second?.score}
                                heightClass="h-[150px]" />
                        </div>

                        <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-3 max-h-60 overflow-auto">
                            {(leaderboard || []).map((p, i) => (
                                <div key={p.playerId}
                                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 text-zinc-400 tabular-nums">#{i + 1}</div>
                                        <div className="text-zinc-100">{p.name}</div>
                                    </div>
                                    <div className="text-zinc-200 tabular-nums">{p.score}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <div className="text-sm text-zinc-400">
                                {isHost ? "Start a rematch." : "Waiting for host to restart the game…"}
                            </div>

                            {isHost ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => rematch("same_settings")}
                                        className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/25"
                                    >
                                        Restart Game
                                    </button>
                                </div>
                            ) : (
                                <div className="px-4 py-2 rounded-lg border border-white/10 text-zinc-300 bg-white/5">
                                    Waiting...
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const PodiumCard = ({
                        place,
                        medal,
                        name,
                        score,
                        heightClass,
                        highlight,
                    }: {
    place: string;
    medal: string;
    name?: string;
    score?: number;
    heightClass: string;
    highlight?: boolean;
}) => {
    const theme =
        place === "1st"
            ? "bg-gold glow-gold"
            : place === "2nd"
                ? "bg-silver glow-silver"
                : "bg-bronze glow-bronze";

    return (
        <div className="w-[30%] flex flex-col items-center">
            <div className="text-center mb-3">
                <div className={`text-4xl ${place === "1st" ? "animate-bounce" : ""}`}>
                    {medal}
                </div>
                <div className="text-xs uppercase tracking-widest text-zinc-300">
                    {place}
                </div>
            </div>

            <div
                className={[
                    "w-full rounded-2xl border border-white/15",
                    "flex flex-col items-center justify-end p-4",
                    "shadow-[0_25px_60px_rgba(0,0,0,0.45)]",
                    "transition-all duration-300",
                    "relative overflow-hidden",
                    "float",
                    heightClass,
                    theme,
                    highlight ? "ring-4 ring-emerald-400/40 scale-[1.04]" : "",
                ].join(" ")}
            >
                {/* Shine layer */}
                <div className="absolute inset-0 bg-linear-to-tr from-white/10 via-transparent to-white/10 opacity-30 pointer-events-none" />

                {/* Name */}
                <div className="relative z-10 text-base md:text-xl font-extrabold text-black text-center truncate w-full drop-shadow">
                    {name ?? "—"}
                </div>

                {/* Score */}
                <div className="relative z-10 text-[11px] md:text-sm text-black/80 tabular-nums font-semibold">
                    {score ?? 0} pts
                </div>
            </div>
        </div>
    );
};
