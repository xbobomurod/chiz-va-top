/**
 * Typed RPC surface for the game. Every call is validated on the server;
 * the client never writes to the database directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().min(10) });

const avatarSchema = z
  .object({
    color: z.number().int(),
    eyes: z.number().int(),
    mouth: z.number().int(),
    hat: z.number().int(),
  })
  .optional();

const settingsSchema = z.object({
  nickname: z.string().trim().min(1).max(16),
  totalRounds: z.number().int().min(1).max(10),
  roundDuration: z.number().int().min(30).max(180),
  maxPlayers: z.number().int().min(2).max(10),
  difficulty: z.enum(["easy", "medium", "difficult"]),
  category: z.string().nullable(),
  avatar: avatarSchema,
});

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/* ---------------------------------------------------------------- */

export const getWordOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { allCategories, datasetSize, allWords } = await import("./words.server");
  const words = allWords();
  return {
    size: datasetSize(),
    categories: allCategories(),
    counts: {
      easy: words.filter((w) => w.difficulty === "easy").length,
      medium: words.filter((w) => w.difficulty === "medium").length,
      difficult: words.filter((w) => w.difficulty === "difficult").length,
    },
  };
});

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let roomCode = code();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("rooms")
        .select("id")
        .eq("code", roomCode)
        .maybeSingle();
      if (!existing) break;
      roomCode = code();
    }

    const { data: room, error } = await supabaseAdmin
      .from("rooms")
      .insert({
        code: roomCode,
        max_players: data.maxPlayers,
        total_rounds: data.totalRounds,
        round_duration: data.roundDuration,
        difficulty: data.difficulty,
        category: data.category,
      })
      .select("*")
      .single();
    if (error || !room) throw new Error("Xona yaratilmadi");

    const { data: player, error: pErr } = await supabaseAdmin
      .from("players")
      .insert({
        room_id: room.id,
        nickname: data.nickname,
        is_host: true,
        ...(data.avatar ? { avatar: data.avatar } : {}),
      })
      .select("*")
      .single();
    if (pErr || !player) throw new Error("O‘yinchi qo‘shilmadi");

    const token = crypto.randomUUID() + crypto.randomUUID();
    await supabaseAdmin.from("player_tokens").insert({ player_id: player.id, token });
    await supabaseAdmin.from("rooms").update({ host_id: player.id }).eq("id", room.id);
    await supabaseAdmin.from("chat_messages").insert({
      room_id: room.id,
      content: `${data.nickname} xonani yaratdi.`,
      kind: "system",
    });

    return { code: roomCode, token, playerId: player.id };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        nickname: z.string().trim().min(1).max(16),
        code: z.string().trim().min(4).max(8),
        avatar: avatarSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRoomByCode, getPlayers } = await import("./game.server");

    const room = await getRoomByCode(data.code);
    if (!room) throw new Error("Bunday xona topilmadi");
    // A finished game shouldn't be a dead end: reopen it as a fresh lobby.
    if (room.status === "finished") {
      await supabaseAdmin
        .from("rooms")
        .update({
          status: "lobby",
          phase: "lobby",
          current_round: 0,
          turn_index: 0,
          turn_order: [],
          current_drawer_id: null,
          phase_ends_at: null,
          reveal_word: null,
          word_mask: null,
          word_length: null,
        })
        .eq("id", room.id);
      await supabaseAdmin.from("players").update({ score: 0 }).eq("room_id", room.id);
    }

    const players = await getPlayers(room.id);
    if (players.filter((p) => p.connected).length >= room.max_players)
      throw new Error("Xona to‘lgan");
    if (
      players.some(
        (p) => p.nickname.toLocaleLowerCase("uz") === data.nickname.toLocaleLowerCase("uz"),
      )
    )
      throw new Error("Bu ism band");

    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({
        room_id: room.id,
        nickname: data.nickname,
        ...(data.avatar ? { avatar: data.avatar } : {}),
      })
      .select("*")
      .single();
    if (error || !player) throw new Error("Qo‘shilib bo‘lmadi");

    const token = crypto.randomUUID() + crypto.randomUUID();
    await supabaseAdmin.from("player_tokens").insert({ player_id: player.id, token });
    await supabaseAdmin.from("chat_messages").insert({
      room_id: room.id,
      content: `${data.nickname} qo‘shildi.`,
      kind: "system",
    });

    return { code: room.code, token, playerId: player.id };
  });

/** Heartbeat + authoritative tick. Called on an interval by every client. */
export const pulse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10), code: z.string().min(4) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRoomByCode, playerFromToken, syncRoom } = await import("./game.server");

    const room = await getRoomByCode(data.code);
    if (!room) return { ok: false as const, reason: "no-room" as const };

    const player = await playerFromToken(data.token);
    if (!player || player.room_id !== room.id) return { ok: false as const, reason: "no-player" as const };

    await supabaseAdmin
      .from("players")
      .update({ last_seen: new Date().toISOString(), connected: true })
      .eq("id", player.id);

    await syncRoom(room);
    return { ok: true as const, playerId: player.id };
  });

/** Drawer-only: the three candidate words. Never sent to anybody else. */
export const getMyChoices = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) return { choices: [] as string[], word: null as string | null };
    const room = await getRoom(player.room_id);
    if (!room || room.current_drawer_id !== player.id)
      return { choices: [] as string[], word: null as string | null };

    const { data: secret } = await supabaseAdmin
      .from("room_secrets")
      .select("word, choices")
      .eq("room_id", room.id)
      .maybeSingle();

    return {
      choices: (secret?.choices as string[] | undefined) ?? [],
      word: (secret?.word as string | null | undefined) ?? null,
    };
  });

export const chooseWord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10), word: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, startDrawing } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.current_drawer_id !== player.id || room.phase !== "choosing")
      throw new Error("Ruxsat yo‘q");

    const { data: secret } = await supabaseAdmin
      .from("room_secrets")
      .select("choices")
      .eq("room_id", room.id)
      .maybeSingle();
    const choices = (secret?.choices as string[] | undefined) ?? [];
    if (!choices.includes(data.word)) throw new Error("Noto‘g‘ri so‘z");

    await startDrawing(room, data.word);
    return { ok: true };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { playerFromToken, getRoom, startGame: start } = await import("./game.server");
    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.host_id !== player.id) throw new Error("Faqat mezbon boshlaydi");
    if (room.status === "playing") return { ok: true };
    await start(room);
    return { ok: true };
  });

export const sendGuess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10), text: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, handleGuess } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room) throw new Error("Xona topilmadi");

    // basic rate limit: max ~2 messages/second per player
    const { data: last } = await supabaseAdmin
      .from("chat_messages")
      .select("created_at")
      .eq("player_id", player.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at as string).getTime() < 450) {
      return { correct: false, close: false, throttled: true };
    }

    const result = await handleGuess(room, player, data.text);
    return { ...result, throttled: false };
  });

/* ------------------------- drawing ------------------------------ */

const strokeSchema = z.object({
  color: z.string().max(24),
  size: z.number().min(1).max(60),
  tool: z.enum(["pen", "eraser"]),
  points: z.array(z.tuple([z.number(), z.number()])).min(1).max(4000),
});

export const addStroke = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10), stroke: strokeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, turnKey } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.current_drawer_id !== player.id || room.phase !== "drawing")
      throw new Error("Faqat chizuvchi chiza oladi");

    await supabaseAdmin.from("strokes").insert({
      room_id: room.id,
      turn_key: turnKey(room),
      player_id: player.id,
      data: data.stroke,
    });
    return { ok: true };
  });

export const undoStroke = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, turnKey } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.current_drawer_id !== player.id) throw new Error("Ruxsat yo‘q");

    const { data: last } = await supabaseAdmin
      .from("strokes")
      .select("id")
      .eq("room_id", room.id)
      .eq("turn_key", turnKey(room))
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) await supabaseAdmin.from("strokes").delete().eq("id", last.id);
    return { ok: true };
  });

export const clearCanvas = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, turnKey } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.current_drawer_id !== player.id) throw new Error("Ruxsat yo‘q");

    await supabaseAdmin
      .from("strokes")
      .delete()
      .eq("room_id", room.id)
      .eq("turn_key", turnKey(room));
    return { ok: true };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom, syncRoom } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) return { ok: true };
    await supabaseAdmin.from("players").update({ connected: false }).eq("id", player.id);
    const room = await getRoom(player.room_id);
    if (room) await syncRoom(room);
    return { ok: true };
  });

/** Play again with the same players. */
export const restartGame = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getRoom } = await import("./game.server");

    const player = await playerFromToken(data.token);
    if (!player) throw new Error("Ruxsat yo‘q");
    const room = await getRoom(player.room_id);
    if (!room || room.host_id !== player.id) throw new Error("Faqat mezbon");

    await supabaseAdmin.from("strokes").delete().eq("room_id", room.id);
    await supabaseAdmin
      .from("players")
      .update({ score: 0, round_score: 0, has_guessed: false })
      .eq("room_id", room.id);
    await supabaseAdmin
      .from("rooms")
      .update({
        status: "lobby",
        phase: "waiting",
        current_round: 0,
        turn_index: 0,
        turn_order: [],
        current_drawer_id: null,
        phase_ends_at: null,
        word_mask: null,
        word_length: null,
        reveal_word: null,
      })
      .eq("id", room.id);
    return { ok: true };
  });


/* ---------------- avatar & moderation ---------------- */

export const updateAvatar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(10),
        avatar: z.object({
          color: z.number().int(),
          eyes: z.number().int(),
          mouth: z.number().int(),
          hat: z.number().int(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken } = await import("./game.server");
    const player = await playerFromToken(data.token);
    if (!player) throw new Error("O‘yinchi topilmadi");
    await supabaseAdmin.from("players").update({ avatar: data.avatar }).eq("id", player.id);
    return { ok: true as const };
  });

const targetSchema = z.object({ token: z.string().min(10), targetId: z.string().uuid() });

async function kickPlayer(roomId: string, targetId: string, nickname: string, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("players")
    .update({ kicked: true, connected: false })
    .eq("id", targetId);
  await supabaseAdmin.from("player_tokens").delete().eq("player_id", targetId);
  await supabaseAdmin.from("chat_messages").insert({
    room_id: roomId,
    content: `${nickname} xonadan chiqarildi (${reason}).`,
    kind: "system",
  });
}

export const voteKick = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => targetSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getPlayers } = await import("./game.server");

    const voter = await playerFromToken(data.token);
    if (!voter) throw new Error("O‘yinchi topilmadi");
    if (voter.id === data.targetId) throw new Error("O‘zingizni chiqara olmaysiz");

    const players = await getPlayers(voter.room_id);
    const target = players.find((p) => p.id === data.targetId);
    if (!target) throw new Error("Bu o‘yinchi topilmadi");

    await supabaseAdmin
      .from("votekicks")
      .upsert(
        { room_id: voter.room_id, target_id: target.id, voter_id: voter.id },
        { onConflict: "room_id,target_id,voter_id" },
      );

    const { data: votes } = await supabaseAdmin
      .from("votekicks")
      .select("voter_id")
      .eq("room_id", voter.room_id)
      .eq("target_id", target.id);

    const activeIds = new Set(players.filter((p) => p.connected).map((p) => p.id));
    const valid = (votes ?? []).filter((v) => activeIds.has(v.voter_id)).length;
    const needed = Math.floor(activeIds.size / 2) + 1;

    if (valid >= needed && activeIds.size >= 3) {
      await kickPlayer(voter.room_id, target.id, target.nickname, "ovoz berish");
      return { ok: true as const, kicked: true, votes: valid, needed };
    }

    await supabaseAdmin.from("chat_messages").insert({
      room_id: voter.room_id,
      content: `${target.nickname} uchun chiqarish ovozi: ${valid}/${needed}`,
      kind: "system",
    });
    return { ok: true as const, kicked: false, votes: valid, needed };
  });

export const reportPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    targetSchema.extend({ reason: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { playerFromToken, getPlayers } = await import("./game.server");

    const reporter = await playerFromToken(data.token);
    if (!reporter) throw new Error("O‘yinchi topilmadi");
    if (reporter.id === data.targetId) throw new Error("O‘zingizga shikoyat qila olmaysiz");

    const players = await getPlayers(reporter.room_id);
    const target = players.find((p) => p.id === data.targetId);
    if (!target) throw new Error("Bu o‘yinchi topilmadi");

    await supabaseAdmin.from("reports").upsert(
      {
        room_id: reporter.room_id,
        target_id: target.id,
        reporter_id: reporter.id,
        reason: data.reason,
      },
      { onConflict: "room_id,target_id,reporter_id" },
    );

    const { data: rows } = await supabaseAdmin
      .from("reports")
      .select("reporter_id")
      .eq("room_id", reporter.room_id)
      .eq("target_id", target.id);

    const count = new Set((rows ?? []).map((r) => r.reporter_id)).size;
    if (count >= 3) {
      await kickPlayer(reporter.room_id, target.id, target.nickname, "shikoyatlar");
      return { ok: true as const, kicked: true, count };
    }
    return { ok: true as const, kicked: false, count };
  });
