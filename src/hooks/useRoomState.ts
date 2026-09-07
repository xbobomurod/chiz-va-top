import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stroke } from "@/lib/drawing";

export interface RoomState {
  id: string;
  code: string;
  status: string;
  phase: "waiting" | "choosing" | "drawing" | "reveal" | "finished";
  max_players: number;
  total_rounds: number;
  round_duration: number;
  difficulty: string;
  category: string | null;
  current_round: number;
  turn_index: number;
  current_drawer_id: string | null;
  phase_ends_at: string | null;
  word_mask: string | null;
  word_length: number | null;
  reveal_word: string | null;
  host_id: string | null;
}

export interface PlayerState {
  id: string;
  nickname: string;
  score: number;
  round_score: number;
  is_host: boolean;
  connected: boolean;
  has_guessed: boolean;
}

export interface ChatMessage {
  id: string;
  player_id: string | null;
  nickname: string | null;
  content: string;
  kind: string;
  created_at: string;
}

export interface StrokeRow {
  id: string;
  turn_key: string;
  data: Stroke;
}

/** Subscribes to every public projection of a room in realtime. */
export function useRoomState(code: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [strokes, setStrokes] = useState<StrokeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const roomIdRef = useRef<string | null>(null);

  const refetch = useCallback(async (roomId: string) => {
    const [p, m, s] = await Promise.all([
      supabase.from("players").select("*").eq("room_id", roomId).order("created_at"),
      supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("strokes").select("id, turn_key, data").eq("room_id", roomId).order("seq"),
    ]);
    setPlayers((p.data ?? []) as PlayerState[]);
    setMessages(((m.data ?? []) as ChatMessage[]).slice().reverse());
    setStrokes((s.data ?? []) as unknown as StrokeRow[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const roomRow = data as unknown as RoomState;
      roomIdRef.current = roomRow.id;
      setRoom(roomRow);
      await refetch(roomRow.id);
      if (cancelled) return;
      setLoading(false);

      channel = supabase
        .channel(`room-${roomRow.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomRow.id}` },
          (payload) => setRoom(payload.new as unknown as RoomState),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomRow.id}` },
          () => void refetch(roomRow.id),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `room_id=eq.${roomRow.id}`,
          },
          (payload) =>
            setMessages((prev) => [...prev, payload.new as unknown as ChatMessage].slice(-80)),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "strokes", filter: `room_id=eq.${roomRow.id}` },
          (payload) => setStrokes((prev) => [...prev, payload.new as unknown as StrokeRow]),
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "strokes" },
          (payload) =>
            setStrokes((prev) => prev.filter((s) => s.id !== (payload.old as { id: string }).id)),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code, refetch]);

  const reload = useCallback(() => {
    if (roomIdRef.current) void refetch(roomIdRef.current);
  }, [refetch]);

  return { room, players, messages, strokes, loading, notFound, reload };
}
