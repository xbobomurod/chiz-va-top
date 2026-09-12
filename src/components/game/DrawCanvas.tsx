import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { drawStroke, drawStrokeTail, type Stroke, type Tool } from "@/lib/drawing";

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
  /** cached bitmap of saved + pending strokes so history isn't redrawn each frame */
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const baseDirtyRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const renderRef = useRef<() => void>(() => undefined);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  strokesRef.current = strokes;
  dimsRef.current = dims;

  /* size — fill the space the layout gives us, keep tools visible on phones */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const available = el.clientHeight;
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const fallback = mobile
        ? Math.max(150, Math.round(window.innerHeight * 0.28))
        : Math.max(300, Math.round(window.innerHeight * 0.62));
      const maxH = available > 80 ? available : fallback;
      const next = { w, h: Math.max(140, Math.min(Math.round((w * 3) / 4), maxH)) };
      setDims((previous) =>
        previous.w === next.w && previous.h === next.h ? previous : next,
      );
      dirtyRef.current = true;
      baseDirtyRef.current = true;
      renderRef.current();
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
          baseDirtyRef.current = true;
        } else {
          liveRef.current[data.stroke.id] = data.stroke;
        }
        dirtyRef.current = true;
        renderRef.current();
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
    baseDirtyRef.current = true;
    renderRef.current();
  }, [turnKey]);

  /* drop a pending stroke only once its saved copy has arrived (or on clear/undo) */
  useEffect(() => {
    const added = strokes.length - savedCountRef.current;
    savedCountRef.current = strokes.length;
    if (added > 0) pendingRef.current.splice(0, added);
    else if (added < 0) pendingRef.current = [];
    dirtyRef.current = true;
    baseDirtyRef.current = true;
    renderRef.current();
  }, [strokes]);

  useEffect(() => {
    dirtyRef.current = true;
    baseDirtyRef.current = true;
    renderRef.current();
  }, [dims]);

  /* The saved history is rasterised once into an offscreen bitmap; each frame
   * only blits that bitmap and repaints the few strokes still in flight. */
  useEffect(() => {
    const render = () => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const full = dirtyRef.current;
      const tail = tailDirtyRef.current;
      if (!full && !tail) return;
      dirtyRef.current = false;
      tailDirtyRef.current = false;
      const { w, h } = dimsRef.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(w * ratio);
      const ph = Math.round(h * ratio);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        baseDirtyRef.current = true;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      /* fast path: only the in-progress stroke grew — paint its new segments */
      if (!full && currentRef.current) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawStrokeTail(ctx, currentRef.current, drawnUpToRef.current, w, h);
        drawnUpToRef.current = currentRef.current.points.length;
        return;
      }

      let base = baseRef.current;
      if (!base) {
        base = document.createElement("canvas");
        baseRef.current = base;
        baseDirtyRef.current = true;
      }
      if (base.width !== pw || base.height !== ph) {
        base.width = pw;
        base.height = ph;
        baseDirtyRef.current = true;
      }
      if (baseDirtyRef.current) {
        baseDirtyRef.current = false;
        const bctx = base.getContext("2d");
        if (bctx) {
          bctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          bctx.clearRect(0, 0, w, h);
          /* opaque base so the fill tool has a real colour to spread over */
          bctx.fillStyle = "#f6efe0";
          bctx.fillRect(0, 0, w, h);
          for (const stroke of strokesRef.current) drawStroke(bctx, stroke, w, h);
          for (const stroke of pendingRef.current) drawStroke(bctx, stroke, w, h);
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      for (const stroke of Object.values(liveRef.current)) drawStroke(ctx, stroke, w, h);
      if (currentRef.current) {
        drawStroke(ctx, currentRef.current, w, h);
        drawnUpToRef.current = currentRef.current.points.length;
      }
    };
    renderRef.current = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(render);
    };
    renderRef.current();
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
    if (tool === "fill") {
      const stroke = currentRef.current;
      currentRef.current = null;
      broadcast(stroke, true);
      pendingRef.current.push(stroke);
      baseDirtyRef.current = true;

      const { id: _id, ...data } = stroke;
      onStrokeFinished(data);
    }
    lastSentRef.current = 0;
    dirtyRef.current = true;
    renderRef.current();
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
    renderRef.current();
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
    baseDirtyRef.current = true;
    const { id: _id, ...stroke } = current;
    onStrokeFinished(stroke);
    dirtyRef.current = true;
    renderRef.current();
  }

  return (
    <div ref={wrapRef} className="flex h-full min-h-0 w-full items-center justify-center">

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
          contain: "strict",
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
