import {useEffect, useMemo, useRef, useState} from "react";
import {socket} from "../../socket/socket.ts";
import {useGameStore} from "../../store/useGameStore.ts";
import type {Point, Stroke} from "../../types/socket.ts";
import WordSelectSheet from "./WordSelectSheet.tsx";

function makeStrokeId() {
    return crypto.randomUUID?.() ?? `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizePts(pts: Point[], canvas: HTMLCanvasElement): Point[] {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    return pts.map(([x, y]) => [x / w, y / h]);
}

function getPos(e: PointerEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // clamp => prevents "drawing outside" when pointer captured & finger drifts
    const cx = Math.max(0, Math.min(rect.width, x));
    const cy = Math.max(0, Math.min(rect.height, y));

    return [cx, cy];
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, canvas: HTMLCanvasElement) {
    const ptsRaw = stroke.points;
    if (!ptsRaw?.length) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const pts = ptsRaw.map(([x, y]) => [x * w, y * h] as Point);

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

    const canDraw = useMemo(() => phase === "drawing" && isDrawer, [phase, isDrawer]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // actual pixel buffer
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);

            // draw using CSS pixels
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();

        const ro = new ResizeObserver(() => resize());
        ro.observe(canvas);

        window.addEventListener("resize", resize);
        window.addEventListener("orientationchange", resize);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", resize);
            window.removeEventListener("orientationchange", resize);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();

        ctx.clearRect(0, 0, rect.width, rect.height);

        ctx.save();
        ctx.fillStyle = "rgba(9,9,11,0.01)";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.restore();

        for (const s of strokes) drawStroke(ctx, s, canvas);
    }, [strokes]);

    // ---- Drawing state (chunked streaming)
    const activeStrokeIdRef = useRef<string | null>(null);
    const pointsRef = useRef<Point[]>([]);
    const flushTimerRef = useRef<number | null>(null);
    const activePointerRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const flush = () => {
            if (!canDraw || !roomCode || !playerId) return;

            const strokeId = activeStrokeIdRef.current;
            const pts = pointsRef.current;

            if (!strokeId || pts.length < 2) return;

            socket.emit("draw:stroke", {
                roomCode,
                playerId,
                strokeId,
                color,
                width,
                points: normalizePts(pts, canvas),
            });

            pointsRef.current = [pts[pts.length - 1]];
        };

        const onDown = (ev: PointerEvent) => {
            if (!canDraw || !roomCode || !playerId) return;

            if (activePointerRef.current !== null) return;

            activePointerRef.current = ev.pointerId;
            canvas.setPointerCapture(ev.pointerId);

            activeStrokeIdRef.current = makeStrokeId();
            pointsRef.current = [getPos(ev, canvas)];
        };

        const onMove = (ev: PointerEvent) => {
            if (!canDraw) return;
            if (activePointerRef.current !== ev.pointerId) return;
            if (!activeStrokeIdRef.current) return;

            pointsRef.current.push(getPos(ev, canvas));

            if (flushTimerRef.current) return;
            flushTimerRef.current = window.setTimeout(() => {
                flushTimerRef.current = null;
                flush();
            }, 40);
        };

        const endStroke = () => {
            if (!canDraw) return;

            if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current);
                flushTimerRef.current = null;
            }

            const strokeId = activeStrokeIdRef.current;
            const pts = pointsRef.current;

            // final flush
            if (strokeId && pts.length >= 2 && roomCode && playerId) {
                socket.emit("draw:stroke", {
                    roomCode,
                    playerId,
                    strokeId,
                    color,
                    width,
                    points: normalizePts(pts, canvas),
                });
            }

            activeStrokeIdRef.current = null;
            pointsRef.current = [];
            activePointerRef.current = null;
        };

        const onUp = (ev: PointerEvent) => {
            if (activePointerRef.current !== ev.pointerId) return;
            endStroke();
        };

        const onCancel = (ev: PointerEvent) => {
            if (activePointerRef.current !== ev.pointerId) return;
            endStroke();
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onCancel);

        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onCancel);
        };
    }, [canDraw, roomCode, playerId, color, width]);

    return (
        <div className="w-full h-full">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 h-full flex flex-col min-h-0">
                <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                    <div className="hidden md:block text-sm text-zinc-300 pt-1">
                        {phase !== "drawing"
                            ? "Waiting for round…"
                            : isDrawer
                                ? "You are drawing"
                                : "Guess the word!"}
                    </div>

                    {isDrawer ? (
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-9 w-11 bg-transparent"
                                title="Color"
                            />

                            <input
                                type="range"
                                min={2}
                                max={20}
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full max-w-[150px]"
                            />

                            <button
                                className="px-3 py-2 text-sm rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 shrink-0"
                                onClick={() => roomCode && playerId && socket.emit("draw:clear", {roomCode, playerId})}
                                disabled={phase !== "drawing"}
                            >
                                Clear
                            </button>
                        </div>
                    ) : (
                        <div className="h-9"/>
                    )}
                </div>

                <div className="flex-1 min-h-0">
                    <canvas
                        ref={canvasRef}
                        className={`h-full bg-transparent w-full rounded-lg touch-none select-none ${
                            canDraw ? "cursor-crosshair" : "cursor-not-allowed opacity-95"
                        }`}
                    />
                </div>

                <WordSelectSheet/>
            </div>
        </div>
    );
}
