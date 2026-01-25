import {useEffect, useMemo, useRef, useState} from "react";
import {useGameStore} from "../../store/useGameStore.ts";
import type {Point, Stroke} from "../../types/socket.ts";
import {socket} from "../../socket/socket.ts";
// import {Undo} from "lucide-react";
import WordSelectSheet from "./WordSelectSheet.tsx";

function makeStrokeId() {
    return crypto.randomUUID?.() ?? `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function getPos(e: PointerEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return [x, y];
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    const pts = stroke.points;
    if (!pts?.length) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
}

export default function CanvasBoard() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const {roomCode, playerId, publicState, strokes} = useGameStore();

    const phase = publicState?.phase;
    const drawerId = publicState?.round.drawerId;
    const isDrawer = !!drawerId && drawerId === playerId;

    const [color, setColor] = useState("#ffffff");
    const [width, setWidth] = useState(6);

    // render all strokes whenever strokes change (simple + reliable)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // background (dark board look)
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        for (const s of strokes) drawStroke(ctx, s);
    }, [strokes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // make crisp canvas
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 900;
        const cssH = canvas.clientHeight || 520;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);

        const ctx = canvas.getContext("2d");
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, []);

    // drawing state
    const activeStrokeIdRef = useRef<string | null>(null);
    const pointsRef = useRef<Point[]>([]);
    const flushTimerRef = useRef<number | null>(null);

    const canDraw = useMemo(() => phase === "drawing" && isDrawer, [phase, isDrawer]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onDown = (ev: PointerEvent) => {
            if (!canDraw || !roomCode || !playerId) return;
            canvas.setPointerCapture(ev.pointerId);

            activeStrokeIdRef.current = makeStrokeId();
            pointsRef.current = [getPos(ev, canvas)];
        };

        const flush = () => {
            if (!canDraw || !roomCode || !playerId) return;
            const strokeId = activeStrokeIdRef.current;
            const pts = pointsRef.current;
            if (!strokeId || pts.length < 2) return;

            // send chunk and reset chunk buffer but keep last point for continuity
            socket.emit("draw:stroke", {
                roomCode,
                playerId,
                strokeId,
                color,
                width,
                points: pts,
            });

            pointsRef.current = [pts[pts.length - 1]];
        };

        const onMove = (ev: PointerEvent) => {
            if (!canDraw) return;
            if (!activeStrokeIdRef.current) return;

            pointsRef.current.push(getPos(ev, canvas));

            // throttle flush ~ every 40ms
            if (flushTimerRef.current) return;
            flushTimerRef.current = window.setTimeout(() => {
                flushTimerRef.current = null;
                flush();
            }, 40);
        };

        const onUp = () => {
            if (!canDraw) return;

            // final flush
            const strokeId = activeStrokeIdRef.current;
            if (strokeId) {
                const pts = pointsRef.current;
                if (pts.length >= 2) {
                    socket.emit("draw:stroke", {
                        roomCode,
                        playerId,
                        strokeId,
                        color,
                        width,
                        points: pts,
                    });
                }
            }

            activeStrokeIdRef.current = null;
            pointsRef.current = [];
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
        };
    }, [canDraw, roomCode, playerId, color, width]);

    return (
        <div className="w-full">
            <div className="rounded-xl h-[250px] md:h-full border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="hidden md:block text-sm text-zinc-300">
                        {phase !== "drawing"
                            ? "Waiting for round…"
                            : isDrawer
                                ? "You are drawing"
                                : "Guess the word!"}
                    </div>

                    {isDrawer ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-8 w-10 bg-transparent"
                                title="Color"
                            />
                            <input
                                type="range"
                                min={2}
                                max={20}
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                            />
                            {/*<button*/}
                            {/*    className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"*/}
                            {/*    onClick={() => roomCode && playerId && socket.emit("draw:undo", {roomCode, playerId})}*/}
                            {/*    disabled={phase !== "drawing"}*/}
                            {/*>*/}
                            {/*    <Undo/>*/}
                            {/*</button>*/}
                            <button
                                className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                                onClick={() => roomCode && playerId && socket.emit("draw:clear", {roomCode, playerId})}
                                disabled={phase !== "drawing"}
                            >
                                Clear
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="w-full">
                    <canvas
                        ref={canvasRef}
                        height={250}
                        className={`h-full w-full rounded-lg ${
                            canDraw ? "cursor-crosshair" : "cursor-not-allowed opacity-95"
                        }`}
                    />
                </div>

                <WordSelectSheet />
            </div>
        </div>
    );
}
