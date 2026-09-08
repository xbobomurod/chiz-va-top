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
  const liveRef = useRef<Record<string, LiveStroke>>({});
  /** finished strokes kept on screen until the saved copy arrives */
  const pendingRef = useRef<LiveStroke[]>([]);
  const savedCountRef = useRef(strokes.length);
  const strokesRef = useRef<Stroke[]>(strokes);
  const dimsRef = useRef({ w: 800, h: 600 });
  const dirtyRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  strokesRef.current = strokes;
  dimsRef.current = dims;

  /* size — keep the board fully visible on phones */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const maxH = Math.max(240, Math.round(window.innerHeight * 0.52));
      setDims({ w, h: Math.min(Math.round((w * 3) / 4), maxH) });
      dirtyRef.current = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  /* realtime broadcast */
  useEffect(() => {
    const channel = supabase.channel(`draw-${roomId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        const data = payload as { stroke: LiveStroke; done?: boolean };
        if (data.done) {
          delete liveRef.current[data.stroke.id];
          pendingRef.current.push(data.stroke);
        } else {
          liveRef.current[data.stroke.id] = data.stroke;
        }
        dirtyRef.current = true;
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
    liveRef.current = {};
    pendingRef.current = [];
    savedCountRef.current = 0;
    currentRef.current = null;
    dirtyRef.current = true;
  }, [turnKey]);

  /* drop a pending stroke only once its saved copy has arrived (or on clear/undo) */
  useEffect(() => {
    const added = strokes.length - savedCountRef.current;
    savedCountRef.current = strokes.length;
    if (added > 0) pendingRef.current.splice(0, added);
    else if (added < 0) pendingRef.current = [];
    dirtyRef.current = true;
  }, [strokes]);

  /* single rAF render loop — smooth on phones, no re-render churn */
  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { w, h } = dimsRef.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const stroke of strokesRef.current) drawStroke(ctx, stroke, w, h);
      for (const stroke of pendingRef.current) drawStroke(ctx, stroke, w, h);
      for (const stroke of Object.values(liveRef.current)) drawStroke(ctx, stroke, w, h);
      if (currentRef.current) drawStroke(ctx, currentRef.current, w, h);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pointFrom = useCallback(
    (e: { clientX: number; clientY: number }, el: HTMLElement): [number, number] => {
      const rect = el.getBoundingClientRect();
      return [
        Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
        Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      ];
    },
    [],
  );

  const broadcast = useCallback((stroke: LiveStroke, done = false) => {
    void channelRef.current?.send({ type: "broadcast", event: "stroke", payload: { stroke, done } });
  }, []);

  function onDown(e: React.PointerEvent) {
    if (!canDraw) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers reject capture on synthetic pointers */
    }
    currentRef.current = {
      id: Math.random().toString(36).slice(2),
      color,
      size,
      tool,
      points: [pointFrom(e, el)],
    };
    lastSentRef.current = 0;
    dirtyRef.current = true;
  }

  function onMove(e: React.PointerEvent) {
    const current = currentRef.current;
    if (!canDraw || !current) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const native = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    if (coalesced.length > 0) {
      for (const point of coalesced) current.points.push(pointFrom(point, el));
    } else {
      current.points.push(pointFrom(e, el));
    }
    if (current.points.length > 4000) current.points.splice(0, current.points.length - 4000);
    dirtyRef.current = true;
    const now = performance.now();
    if (now - lastSentRef.current > 33) {
      lastSentRef.current = now;
      broadcast(current);
    }
  }

  function onUp(e: React.PointerEvent) {
    const current = currentRef.current;
    currentRef.current = null;
    if (!canDraw || !current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    broadcast(current, true);
    pendingRef.current.push(current);
    const { id: _id, ...stroke } = current;
    onStrokeFinished(stroke);
    dirtyRef.current = true;
  }

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: dims.h,
          touchAction: "none",
          overscrollBehavior: "contain",
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
        }}
        className={`w-full rounded-xl bg-cream select-none ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
