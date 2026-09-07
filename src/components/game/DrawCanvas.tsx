import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { drawStroke, type Stroke, type Tool } from "@/lib/drawing";

interface Props {
  roomId: string;
  turnKey: string;
  strokes: Stroke[];
  canDraw: boolean;
  color: string;
  size: number;
  tool: Tool;
  onStrokeFinished: (stroke: Stroke) => void;
}

interface LiveStroke extends Stroke {
  id: string;
}

/** Collaborative canvas. Live points travel over Realtime broadcast;
 *  finished strokes are persisted by the server so reconnects restore them. */
export function DrawCanvas({
  roomId,
  turnKey,
  strokes,
  canDraw,
  color,
  size,
  tool,
  onStrokeFinished,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentRef = useRef<LiveStroke | null>(null);
  const lastSentRef = useRef(0);
  const [live, setLive] = useState<Record<string, LiveStroke>>({});
  const [dims, setDims] = useState({ w: 800, h: 600 });

  /* size */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth;
      setDims({ w, h: Math.round((w * 3) / 4) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* realtime broadcast */
  useEffect(() => {
    const channel = supabase.channel(`draw-${roomId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        const data = payload as { stroke: LiveStroke; done?: boolean };
        setLive((prev) => ({ ...prev, [data.stroke.id]: data.stroke }));
        if (data.done) {
          setTimeout(() => {
            setLive((prev) => {
              const next = { ...prev };
              delete next[data.stroke.id];
              return next;
            });
          }, 700);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  /* clear live previews when the turn changes */
  useEffect(() => {
    setLive({});
    currentRef.current = null;
  }, [turnKey]);

  /* render */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = dims.w * ratio;
    canvas.height = dims.h * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    for (const stroke of strokes) drawStroke(ctx, stroke, dims.w, dims.h);
    for (const stroke of Object.values(live)) drawStroke(ctx, stroke, dims.w, dims.h);
    if (currentRef.current) drawStroke(ctx, currentRef.current, dims.w, dims.h);
  }, [strokes, live, dims]);

  const pointFrom = useCallback((e: React.PointerEvent): [number, number] => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ];
  }, []);

  const broadcast = useCallback((stroke: LiveStroke, done = false) => {
    void channelRef.current?.send({ type: "broadcast", event: "stroke", payload: { stroke, done } });
  }, []);

  const redrawTick = useCallback(() => {
    setLive((prev) => ({ ...prev }));
  }, []);

  function onDown(e: React.PointerEvent) {
    if (!canDraw) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    currentRef.current = {
      id: `${Math.random().toString(36).slice(2)}`,
      color,
      size,
      tool,
      points: [pointFrom(e)],
    };
    redrawTick();
  }

  function onMove(e: React.PointerEvent) {
    const current = currentRef.current;
    if (!canDraw || !current) return;
    current.points.push(pointFrom(e));
    if (current.points.length > 3000) current.points.shift();
    const now = Date.now();
    if (now - lastSentRef.current > 55) {
      lastSentRef.current = now;
      broadcast(current);
    }
    redrawTick();
  }

  function onUp() {
    const current = currentRef.current;
    currentRef.current = null;
    if (!canDraw || !current) return;
    broadcast(current, true);
    const { id: _id, ...stroke } = current;
    onStrokeFinished(stroke);
    redrawTick();
  }

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h, touchAction: "none" }}
        className={`w-full rounded-xl bg-cream ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
