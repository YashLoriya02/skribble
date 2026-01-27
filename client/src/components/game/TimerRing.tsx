import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import {SFX} from "../../audio/sound.ts";

type Props = {
    size?: number;
    stroke?: number;
};

export default function TimerRing({ size = 54, stroke = 6 }: Props) {
    const { publicState } = useGameStore();

    const phase = publicState?.phase;

    const endsAt = useMemo(() => {
        if (!publicState) return null;
        if (phase === "selecting_word") return publicState.round.wordSelectEndsAt;
        if (phase === "drawing") return publicState.round.endsAt;
        return null;
    }, [publicState, phase]);

    const totalMs = useMemo(() => {
        if (!publicState) return null;
        if (phase === "selecting_word") return 10_000; // WORD_SELECT_WINDOW_MS
        if (phase === "drawing") return (publicState.settings.roundDurationSec || 80) * 1000;
        return null;
    }, [publicState, phase]);

    const [lastTickSec, setLastTickSec] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        let raf = 0;
        const loop = () => {
            setNow(Date.now());
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const msLeft = endsAt ? Math.max(0, endsAt - now) : 0;
    const secLeft = endsAt ? Math.max(0, Math.ceil(msLeft / 1000)) : 0;

    const pct = useMemo(() => {
        if (!endsAt || !totalMs || totalMs <= 0) return 0;
        const p = msLeft / totalMs;
        return Math.max(0, Math.min(1, p));
    }, [endsAt, totalMs, msLeft]);

    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * pct;

    const urgent = secLeft <= 10 && phase === "drawing";

    useEffect(() => {
        if (!endsAt) return;
        if (phase !== "drawing") return;

        if (secLeft % 2 == 0 && secLeft <= 10 && secLeft >= 1) {
            if (lastTickSec !== secLeft) {
                setLastTickSec(secLeft);
                SFX.play("tick");
            }
        } else {
            if (lastTickSec !== null) setLastTickSec(null);
        }
    }, [secLeft, endsAt, phase, lastTickSec]);


    return (
        <div className="flex items-center gap-2">
            <div
                className={`relative flex items-center justify-center ${urgent ? "animate-pulse" : ""}`}
                style={{ width: size, height: size }}
            >
                <svg width={size} height={size} className="rotate-[-90deg]">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        stroke="currentColor"
                        strokeWidth={stroke}
                        className="text-white/15"
                        fill="none"
                    />

                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        stroke="currentColor"
                        strokeWidth={stroke}
                        className="text-blue-400"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${c - dash}`}
                    />
                </svg>

                <div className="absolute text-[10px] md:text-sm font-semibold tabular-nums text-white/90">
                    {endsAt ? secLeft : "--"}
                </div>
            </div>
        </div>
    );
}
