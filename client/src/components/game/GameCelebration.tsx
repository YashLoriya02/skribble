import {useEffect, useRef, useState} from "react";
import confetti from "canvas-confetti";
import { socket } from "../../socket/socket.ts";
import { useGameStore } from "../../store/useGameStore.ts";

type Player = { name: string; score: number; playerId: string };
type ConfettiFn = ReturnType<typeof confetti.create>;

function confettiCannons(fx: ConfettiFn) {
    fx({
        particleCount: 180,
        angle: 60,
        spread: 70,
        startVelocity: 55,
        ticks: 140,
        origin: { x: 0, y: 0.9 },
    });

    fx({
        particleCount: 180,
        angle: 120,
        spread: 70,
        startVelocity: 55,
        ticks: 140,
        origin: { x: 1, y: 0.9 },
    });
}

function fireworkBurst(fx: ConfettiFn) {
    const duration = 900;
    const end = Date.now() + duration;

    const interval = window.setInterval(() => {
        const timeLeft = end - Date.now();
        if (timeLeft <= 0) {
            window.clearInterval(interval);
            return;
        }

        fx({
            particleCount: 35,
            startVelocity: 40,
            spread: 360,
            ticks: 100,
            gravity: 1.0,
            scalar: 1.0,
            origin: { x: Math.random(), y: Math.random() * 0.35 },
        });
    }, 120);

    return interval;
}

export default function WinnerCelebration({
    open,
    top3,
    winner,
}: {
    open: boolean;
    top3: Player[];
    winner?: Player;
}) {
    const [stage, setStage] = useState<"countdown" | "reveal">("countdown");
    const [count, setCount] = useState(5);
    const { publicState, roomCode, playerId, setLeaderboard, setShowCelebration } = useGameStore();

    const winnerName = winner?.name ?? "Winner";
    const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const fxRef = useRef<ConfettiFn | null>(null);

    useEffect(() => {
        if (!open) return;

        const canvas = fxCanvasRef.current;
        if (!canvas) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        fxRef.current = confetti.create(canvas, { resize: true, useWorker: true });

        return () => {
            window.removeEventListener("resize", resize);
            fxRef.current = null;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        setStage("countdown");
        setCount(5);

        const t = window.setInterval(() => {
            setCount((c) => {
                if (c <= 1) {
                    window.clearInterval(t);
                    setStage("reveal");
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => window.clearInterval(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (stage !== "reveal") return;

        const fx = fxRef.current;
        if (!fx) return;

        confettiCannons(fx);

        const fi = fireworkBurst(fx);
        const fw2 = window.setTimeout(() => fireworkBurst(fx), 600);
        const fw3 = window.setTimeout(() => fireworkBurst(fx), 1200);

        return () => {
            window.clearInterval(fi);
            window.clearTimeout(fw2);
            window.clearTimeout(fw3);
        };
    }, [open, stage]);

    const isHost = publicState?.hostPlayerId === playerId;
    const rematch = (mode: "fresh" | "same_settings") => {
        if (!roomCode || !playerId) return;
        socket.emit("game:rematch", { roomCode, playerId, mode });
        setLeaderboard(null);
        setShowCelebration(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <canvas
                ref={fxCanvasRef}
                className="pointer-events-none fixed inset-0 z-[10000]"
            />

            <div className="absolute inset-0 bg-black/10 backdrop-blur-md" />

            <div
                className="relative w-[92%] max-w-3xl rounded-3xl border border-white/10 bg-zinc-950/50 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%)]" />
                <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.15),transparent_60%)]" />

                <div className="relative p-6 md:p-8">
                    {stage === "countdown" ? (
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                                Results incoming
                            </div>

                            <div className="mt-4 text-5xl md:text-7xl font-black tabular-nums text-white">
                                {count}
                            </div>

                            <div className="mt-6 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400/60 transition-all duration-1000"
                                    style={{ width: `${((5 - count) / 5) * 100}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center">
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
                                    <span className="text-xl">🏆</span>
                                    <span className="text-sm text-zinc-200">
                                        Champion:{" "}
                                        <span className="font-bold text-emerald-300">
                                            {winnerName}
                                        </span>
                                    </span>
                                </div>

                                <div className="mt-4 text-3xl md:text-5xl font-black text-white">
                                    WINNER 🎉
                                </div>

                                <div className="mt-2 text-sm text-zinc-400">
                                    Victory ceremony time. Respect the podium.
                                </div>
                            </div>

                            {/* podium */}
                            <div className="mt-8 flex items-end justify-center gap-3 md:gap-6">
                                {top3?.[2] ? (
                                    <PodiumBox
                                        place="3rd"
                                        medal="🥉"
                                        player={top3[2]}
                                        className="h-30 md:h-37.5"
                                    />
                                ) : (
                                    <PodiumBox place="3rd" medal="🥉" className="h-30 md:h-37.5" />
                                )}

                                {top3?.[0] ? (
                                    <PodiumBox
                                        place="1st"
                                        medal="🥇"
                                        player={top3[0]}
                                        className="h-42.5 md:h-55"
                                        crown
                                    />
                                ) : (
                                    <PodiumBox place="1st" medal="🥇" className="h-42.5 md:h-55" crown />
                                )}

                                {top3?.[1] ? (
                                    <PodiumBox
                                        place="2nd"
                                        medal="🥈"
                                        player={top3[1]}
                                        className="h-35 md:h-45"
                                    />
                                ) : (
                                    <PodiumBox place="2nd" medal="🥈" className="h-35 md:h-45" />
                                )}
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
                                    <div
                                        className="px-4 py-2 rounded-lg border border-white/10 text-zinc-300 bg-white/5">
                                        Waiting...
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


function PodiumBox({
    place,
    medal,
    player,
    className,
    crown,
}: {
    place: "1st" | "2nd" | "3rd";
    medal: string;
    player?: Player;
    className: string;
    crown?: boolean;
}) {
    const theme =
        place === "1st"
            ? "from-yellow-300 via-yellow-500 to-yellow-300 shadow-[0_0_50px_rgba(255,215,0,0.4)]"
            : place === "2nd"
                ? "from-zinc-200 via-zinc-400 to-zinc-200 shadow-[0_0_45px_rgba(220,220,220,0.25)]"
                : "from-amber-600 via-amber-800 to-amber-600 shadow-[0_0_40px_rgba(205,127,50,0.25)]";

    return (
        <div className="w-[30%] flex flex-col items-center">
            <div className="text-center mb-3">
                <div className="text-3xl">{medal}</div>
                <div className="text-xs uppercase tracking-widest text-zinc-300">
                    {place}
                </div>
            </div>

            <div
                className={[
                    "relative w-full rounded-2xl border border-white/10 overflow-hidden",
                    "bg-linear-to-br",
                    theme,
                    className,
                    "flex flex-col items-center justify-end p-4",
                    "transition-all duration-300",
                ].join(" ")}
            >
                <div
                    className="absolute inset-0 bg-linear-to-tr from-white/20 via-transparent to-white/10 opacity-30" />

                {crown ? (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-[crownPop_900ms_ease-out]">
                        <div className="relative">
                            <div
                                className="text-5xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-[float_2.8s_ease-in-out_infinite]">
                                👑
                            </div>
                            <div className="absolute inset-0 blur-xl opacity-30 bg-yellow-200 rounded-full" />
                        </div>
                    </div>
                ) : null}

                <div className="relative z-10 w-full text-center">
                    <div className="text-sm md:text-lg font-extrabold text-black truncate">
                        {player?.name ?? "—"}
                    </div>
                    <div className="mt-1 text-[11px] md:text-sm font-semibold text-black/80 tabular-nums">
                        {player?.score ?? 0} pts
                    </div>
                </div>
            </div>
        </div>
    );
}
