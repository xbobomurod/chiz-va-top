/**
 * Server-authoritative game engine.
 * Every state transition, score and secret word lives here — clients only ask
 * the server to act and read the public projection back through Realtime.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildMask, guessMatches, isClose, letterIndexes, normalizeGuess } from "./uz-text";
import { pickWords, type Difficulty } from "./words.server";

export const CHOOSE_SECONDS = 15;
export const REVEAL_SECONDS = 6;
export const DISCONNECT_MS = 20_000;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export type Phase = "waiting" | "choosing" | "drawing" | "reveal" | "finished";

export interface RoomRow {
  id: string;
  code: string;
  status: string;
  phase: Phase;
  max_players: number;
  total_rounds: number;
  round_duration: number;
  difficulty: string;
  category: string | null;
  current_round: number;
  turn_index: number;
  turn_order: string[];
  current_drawer_id: string | null;
  phase_ends_at: string | null;
  word_mask: string | null;
  word_length: number | null;
  reveal_word: string | null;
  host_id: string | null;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  nickname: string;
  score: number;
  round_score: number;
  is_host: boolean;
  connected: boolean;
  has_guessed: boolean;
  last_seen: string;
  created_at: string;
}

const db = () => supabaseAdmin;

export function turnKey(room: Pick<RoomRow, "current_round" | "turn_index">): string {
  return `${room.current_round}-${room.turn_index}`;
}

export async function getRoomByCode(code: string): Promise<RoomRow | null> {
  const { data } = await db()
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as RoomRow | null) ?? null;
}

export async function getRoom(id: string): Promise<RoomRow | null> {
  const { data } = await db().from("rooms").select("*").eq("id", id).maybeSingle();
  return (data as RoomRow | null) ?? null;
}

export async function getPlayers(roomId: string): Promise<PlayerRow[]> {
  const { data } = await db()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  return (data as PlayerRow[] | null) ?? [];
}

export async function playerFromToken(token: string): Promise<PlayerRow | null> {
  const { data } = await db()
    .from("player_tokens")
    .select("player_id")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const { data: player } = await db()
    .from("players")
    .select("*")
    .eq("id", (data as { player_id: string }).player_id)
    .maybeSingle();
  return (player as PlayerRow | null) ?? null;
}

export async function say(
  roomId: string,
  content: string,
  kind: "system" | "correct" | "guess" | "close" = "system",
  player?: { id: string; nickname: string },
) {
  await db().from("chat_messages").insert({
    room_id: roomId,
    content,
    kind,
    player_id: player?.id ?? null,
    nickname: player?.nickname ?? null,
  });
}

function inSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/* ------------------------------------------------------------------ */
/* Turn lifecycle                                                      */
/* ------------------------------------------------------------------ */

async function beginTurn(room: RoomRow) {
  const players = await getPlayers(room.id);
  const order = room.turn_order.filter((id) => players.some((p) => p.id === id));
  const drawerId = order[room.turn_index % Math.max(order.length, 1)] ?? null;
  const drawer = players.find((p) => p.id === drawerId);

  if (!drawer || !drawer.connected) {
    // Drawer is gone — skip straight to the next turn.
    await advanceTurn(room);
    return;
  }

  const choices = pickWords(
    (room.difficulty as Difficulty) ?? "easy",
    room.category,
    3,
  );

  await db()
    .from("players")
    .update({ has_guessed: false, round_score: 0 })
    .eq("room_id", room.id);

  await db()
    .from("strokes")
    .delete()
    .eq("room_id", room.id)
    .eq("turn_key", turnKey(room));

  await db().from("room_secrets").upsert({
    room_id: room.id,
    word: null,
    choices,
    turn_started_at: null,
    correct_count: 0,
  });

  await db()
    .from("rooms")
    .update({
      phase: "choosing",
      status: "playing",
      current_drawer_id: drawer.id,
      phase_ends_at: inSeconds(CHOOSE_SECONDS),
      word_mask: null,
      word_length: null,
      reveal_word: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  await say(room.id, `${drawer.nickname} so‘z tanlamoqda…`);
}

export async function startDrawing(room: RoomRow, word: string) {
  if (!room.current_drawer_id) return false;
  // Claim this exact choosing phase first. Several players pulse the room at
  // once, so a late auto-choice must not overwrite the drawer's real choice.
  const { data: claimed } = await db()
    .from("rooms")
    .update({
      phase: "drawing",
      phase_ends_at: inSeconds(room.round_duration),
      word_mask: buildMask(word),
      word_length: Array.from(word).length,
      reveal_word: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .eq("phase", "choosing")
    .eq("current_round", room.current_round)
    .eq("turn_index", room.turn_index)
    .eq("current_drawer_id", room.current_drawer_id)
    .select("id")
    .maybeSingle();

  if (!claimed) return false;

  await db()
    .from("room_secrets")
    .update({ word, turn_started_at: new Date().toISOString(), correct_count: 0 })
    .eq("room_id", room.id);

  await say(room.id, "O‘yin boshlandi — so‘zni toping!");
  return true;
}

export async function endTurn(room: RoomRow, reason: "time" | "all" | "skip") {
  if (!room.current_drawer_id) return false;
  const { data: secret } = await db()
    .from("room_secrets")
    .select("word")
    .eq("room_id", room.id)
    .maybeSingle();
  const word = (secret as { word: string | null } | null)?.word ?? null;

  // Only one request may end this turn. Without this guard, simultaneous
  // heartbeats can replay the transition with stale room data.
  const { data: claimed } = await db()
    .from("rooms")
    .update({
      phase: "reveal",
      reveal_word: word,
      word_mask: word ? buildMask(word, letterIndexes(word)) : null,
      phase_ends_at: inSeconds(REVEAL_SECONDS),
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .in("phase", ["choosing", "drawing"])
    .eq("current_round", room.current_round)
    .eq("turn_index", room.turn_index)
    .eq("current_drawer_id", room.current_drawer_id)
    .select("id")
    .maybeSingle();

  if (!claimed) return false;

  await db().from("room_secrets").update({ word: null, choices: [] }).eq("room_id", room.id);

  if (reason === "time") await say(room.id, "Vaqt tugadi!");
  if (reason === "all") await say(room.id, "Hamma topdi!");
  if (reason === "skip") await say(room.id, "Chizuvchi chiqib ketdi — navbat o‘tkazildi.");
  if (word) await say(room.id, `To‘g‘ri javob: ${word}`);
  return true;
}

async function advanceTurn(room: RoomRow) {
  const players = await getPlayers(room.id);
  const order = room.turn_order.filter((id) => players.some((p) => p.id === id));
  let turnIndex = room.turn_index + 1;
  let round = room.current_round;

  if (turnIndex >= order.length) {
    turnIndex = 0;
    round += 1;
  }

  if (order.length === 0 || round > room.total_rounds) {
    await db()
      .from("rooms")
      .update({
        status: "finished",
        phase: "finished",
        phase_ends_at: null,
        current_drawer_id: null,
        reveal_word: null,
        word_mask: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    await say(room.id, "O‘yin tugadi! Natijalarni ko‘ring.");
    return;
  }

  // Move through a short internal waiting phase while the next turn is being
  // prepared. The compare-and-swap prevents stale pulses from advancing the
  // same reveal more than once.
  const { data: claimed } = await db()
    .from("rooms")
    .update({ phase: "waiting", turn_index: turnIndex, current_round: round, turn_order: order })
    .eq("id", room.id)
    .eq("phase", "reveal")
    .eq("current_round", room.current_round)
    .eq("turn_index", room.turn_index)
    .select("id")
    .maybeSingle();

  if (!claimed) return;

  const fresh = await getRoom(room.id);
  if (fresh) await beginTurn(fresh);
}

export async function startGame(room: RoomRow) {
  const players = (await getPlayers(room.id)).filter((p) => p.connected);
  if (players.length < MIN_PLAYERS) throw new Error("Kamida 2 o‘yinchi kerak");

  const order = [...players].sort(() => Math.random() - 0.5).map((p) => p.id);
  await db().from("players").update({ score: 0, round_score: 0, has_guessed: false }).eq("room_id", room.id);
  await db()
    .from("rooms")
    .update({ status: "playing", phase: "waiting", turn_order: order, turn_index: 0, current_round: 1 })
    .eq("id", room.id);

  const fresh = await getRoom(room.id);
  if (fresh) await beginTurn(fresh);
}

/* ------------------------------------------------------------------ */
/* Tick — the only place where time advances the game                   */
/* ------------------------------------------------------------------ */

export async function syncRoom(room: RoomRow): Promise<void> {
  const now = Date.now();
  const players = await getPlayers(room.id);

  // 1. Disconnect detection
  const stale = players.filter(
    (p) => p.connected && now - new Date(p.last_seen).getTime() > DISCONNECT_MS,
  );
  if (stale.length) {
    await db()
      .from("players")
      .update({ connected: false })
      .in("id", stale.map((p) => p.id));
    for (const p of stale) await say(room.id, `${p.nickname} o‘yinni tark etdi.`);
  }

  const live = players.filter(
    (p) => p.connected && !stale.some((s) => s.id === p.id),
  );

  // 2. Host handover
  if (!live.some((p) => p.id === room.host_id) && live.length > 0) {
    const newHost = live[0]!;
    await db().from("players").update({ is_host: false }).eq("room_id", room.id);
    await db().from("players").update({ is_host: true }).eq("id", newHost.id);
    await db().from("rooms").update({ host_id: newHost.id }).eq("id", room.id);
    await say(room.id, `${newHost.nickname} yangi mezbon.`);
  }

  if (room.status !== "playing") return;

  // 3. Drawer disconnected mid-turn
  if (
    (room.phase === "choosing" || room.phase === "drawing") &&
    !live.some((p) => p.id === room.current_drawer_id)
  ) {
    await endTurn(room, "skip");
    return;
  }

  // 4. Not enough players left
  if (live.length < MIN_PLAYERS && room.phase !== "finished") {
    if (room.phase === "drawing" || room.phase === "choosing") {
      await endTurn(room, "skip");
      return;
    }
  }

  const deadline = room.phase_ends_at ? new Date(room.phase_ends_at).getTime() : null;

  if (room.phase === "choosing") {
    if (deadline && now >= deadline) {
      const { data } = await db()
        .from("room_secrets")
        .select("choices")
        .eq("room_id", room.id)
        .maybeSingle();
      const choices = ((data as { choices: string[] } | null)?.choices ?? []).filter(Boolean);
      if (choices.length) {
        await startDrawing(room, choices[0]!);
      } else {
        await endTurn(room, "skip");
      }
    }
    return;
  }

  if (room.phase === "drawing") {
    if (deadline && now >= deadline) {
      await endTurn(room, "time");
      return;
    }
    await updateHint(room, live.length);
    return;
  }

  if (room.phase === "reveal") {
    if (deadline && now >= deadline) await advanceTurn(room);
  }
}

/** Progressively reveal letters in the second half of the turn. */
async function updateHint(room: RoomRow, _liveCount: number) {
  const { data } = await db()
    .from("room_secrets")
    .select("word, turn_started_at")
    .eq("room_id", room.id)
    .maybeSingle();
  const secret = data as { word: string | null; turn_started_at: string | null } | null;
  if (!secret?.word || !secret.turn_started_at) return;

  const elapsed = (Date.now() - new Date(secret.turn_started_at).getTime()) / 1000;
  const frac = Math.min(1, elapsed / room.round_duration);
  const indexes = letterIndexes(secret.word);
  const maxReveal = Math.max(0, Math.floor(indexes.length / 3));
  const revealCount =
    frac < 0.45 ? 0 : Math.min(maxReveal, Math.floor(((frac - 0.45) / 0.5) * maxReveal) + 1);

  // Deterministic pick so every client sees the same hint.
  const picked = indexes
    .map((idx, i) => ({ idx, key: (idx * 31 + i * 17) % 97 }))
    .sort((a, b) => a.key - b.key)
    .slice(0, revealCount)
    .map((x) => x.idx);

  const mask = buildMask(secret.word, picked);
  if (mask !== room.word_mask) {
    await db().from("rooms").update({ word_mask: mask }).eq("id", room.id);
  }
}

/* ------------------------------------------------------------------ */
/* Guessing + scoring                                                   */
/* ------------------------------------------------------------------ */

export async function handleGuess(
  room: RoomRow,
  player: PlayerRow,
  text: string,
): Promise<{ correct: boolean; close: boolean }> {
  const trimmed = text.trim().slice(0, 120);
  if (!trimmed) return { correct: false, close: false };

  const isDrawer = room.current_drawer_id === player.id;

  if (room.phase !== "drawing" || isDrawer || player.has_guessed) {
    // The drawer may chat, but must not spell out the hidden word.
    if (isDrawer && room.phase === "drawing") {
      const { data: hidden } = await db()
        .from("room_secrets")
        .select("word")
        .eq("room_id", room.id)
        .maybeSingle();
      const word = (hidden as { word: string | null } | null)?.word ?? null;
      if (word && guessMatches(trimmed, word)) {
        await say(room.id, `${player.nickname} so‘zni aytmoqchi bo‘ldi 🤫`, "close");
        return { correct: false, close: false };
      }
    }
    await say(room.id, trimmed, "guess", player);
    return { correct: false, close: false };
  }

  const { data } = await db()
    .from("room_secrets")
    .select("word, turn_started_at, correct_count")
    .eq("room_id", room.id)
    .maybeSingle();
  const secret = data as
    | { word: string | null; turn_started_at: string | null; correct_count: number }
    | null;

  if (!secret?.word) {
    await say(room.id, trimmed, "guess", player);
    return { correct: false, close: false };
  }

  if (!guessMatches(trimmed, secret.word)) {
    const close = isClose(trimmed, secret.word);
    await say(room.id, trimmed, "guess", player);
    if (close) await say(room.id, `${player.nickname} juda yaqin!`, "close");
    return { correct: false, close };
  }

  // Correct — server calculates the score.
  const deadline = room.phase_ends_at ? new Date(room.phase_ends_at).getTime() : Date.now();
  const remaining = Math.max(0, deadline - Date.now()) / 1000;
  const frac = Math.min(1, remaining / room.round_duration);
  const rank = secret.correct_count;
  const points = 60 + Math.round(240 * frac) + (rank === 0 ? 40 : 0);
  const drawerPoints = 30 + Math.round(20 * frac);

  await db()
    .from("players")
    .update({
      has_guessed: true,
      score: player.score + points,
      round_score: points,
    })
    .eq("id", player.id)
    .eq("has_guessed", false); // prevents double scoring

  await db()
    .from("room_secrets")
    .update({ correct_count: rank + 1 })
    .eq("room_id", room.id);

  if (room.current_drawer_id) {
    const drawer = (await getPlayers(room.id)).find((p) => p.id === room.current_drawer_id);
    if (drawer) {
      await db()
        .from("players")
        .update({ score: drawer.score + drawerPoints, round_score: drawer.round_score + drawerPoints })
        .eq("id", drawer.id);
    }
  }

  await say(room.id, `${player.nickname} topdi! +${points}`, "correct", player);

  const players = await getPlayers(room.id);
  const guessers = players.filter((p) => p.connected && p.id !== room.current_drawer_id);
  if (guessers.length > 0 && guessers.every((p) => p.has_guessed)) {
    const fresh = await getRoom(room.id);
    if (fresh) await endTurn(fresh, "all");
  }

  return { correct: true, close: false };
}

export { normalizeGuess };
