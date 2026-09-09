import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatPanel } from "@/components/game/ChatPanel";
import { DrawCanvas } from "@/components/game/DrawCanvas";
import { GameTopBar } from "@/components/game/GameTopBar";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Lobby } from "@/components/game/Lobby";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { Toolbar } from "@/components/game/Toolbar";
import { useRoomState } from "@/hooks/useRoomState";
import type { Stroke, Tool } from "@/lib/drawing";
import {
  addStroke,
  chooseWord,
  clearCanvas,
  getMyChoices,
  joinRoom,
  leaveRoom,
  pulse,
  restartGame,
  sendGuess,
  startGame,
  undoStroke,
} from "@/lib/game.functions";
import { clearIdentity, getIdentity, getNickname, setIdentity, setNickname } from "@/lib/identity";

export const Route = createFileRoute("/xona/$code")({
  head: () => ({
    meta: [
      { title: "O‘yin xonasi — Chiz & Top" },
      {
        name: "description",
        content: "Chiz & Top o‘yin xonasi: chizing, toping va ball to‘plang.",
      },
      { property: "og:title", content: "O‘yin xonasi — Chiz & Top" },
      { property: "og:description", content: "Do‘stlar bilan real vaqtda chizish va topish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const upperCode = code.toUpperCase();

  const [token, setToken] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const identity = getIdentity(upperCode);
    if (identity) {
      setToken(identity.token);
      setMeId(identity.playerId);
    }
    setReady(true);
  }, [upperCode]);

  const { room, players, messages, strokes, loading, notFound, reload } = useRoomState(upperCode);

  const pulseFn = useServerFn(pulse);
  const guessFn = useServerFn(sendGuess);
  const startFn = useServerFn(startGame);
  const chooseFn = useServerFn(chooseWord);
  const choicesFn = useServerFn(getMyChoices);
  const strokeFn = useServerFn(addStroke);
  const undoFn = useServerFn(undoStroke);
  const clearFn = useServerFn(clearCanvas);
  const leaveFn = useServerFn(leaveRoom);
  const restartFn = useServerFn(restartGame);

  const [now, setNow] = useState(() => Date.now());
  const [choices, setChoices] = useState<string[]>([]);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [color, setColor] = useState("#0a1822");
  const [size, setSize] = useState(10);
  const [tool, setTool] = useState<Tool>("pen");
  const [showPlayers, setShowPlayers] = useState(false);
  const [pickedWord, setPickedWord] = useState<string | null>(null);

  /* heartbeat + server tick */
  useEffect(() => {
    if (!token) return;
    let stopped = false;
    const beat = async () => {
      try {
        const result = await pulseFn({ data: { token, code: upperCode } });
        if (!stopped && result.ok) setMeId(result.playerId);
        if (!stopped && !result.ok && result.reason === "no-player") {
          clearIdentity(upperCode);
          setToken(null);
        }
      } catch {
        /* transient network issue — the next beat retries */
      }
    };
    void beat();
    const id = setInterval(beat, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [token, upperCode, pulseFn]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const isDrawer = !!room && !!meId && room.current_drawer_id === meId;
  const me = players.find((p) => p.id === meId);
  const drawer = players.find((p) => p.id === room?.current_drawer_id);

  /* drawer-only secret data */
  const phase = room?.phase;
  const currentRound = room?.current_round;
  const turnIndex = room?.turn_index;
  useEffect(() => {
    if (!token || !isDrawer || (phase !== "choosing" && phase !== "drawing")) {
      setChoices([]);
      setSecretWord(null);
      return;
    }
    let cancelled = false;
    let done = false;
    const fetchSecret = async () => {
      try {
        const result = await choicesFn({ data: { token } });
        if (cancelled) return;
        setChoices(result.choices);
        setSecretWord(result.word);
        if (
          (phase === "choosing" && result.choices.length > 0) ||
          (phase === "drawing" && !!result.word)
        ) {
          done = true;
        }
      } catch {
        /* retried by the interval below */
      }
    };
    void fetchSecret();
    const id = setInterval(() => {
      if (!done) void fetchSecret();
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, isDrawer, phase, currentRound, turnIndex, choicesFn]);




  const secondsLeft = useMemo(() => {
    if (!room?.phase_ends_at) return 0;
    return Math.max(0, (new Date(room.phase_ends_at).getTime() - now) / 1000);
  }, [room?.phase_ends_at, now]);

  const turnKey = room ? `${room.current_round}-${room.turn_index}` : "0-0";
  const turnStrokes = useMemo(
    () => strokes.filter((s) => s.turn_key === turnKey).map((s) => s.data as Stroke),
    [strokes, turnKey],
  );

  const handleStroke = useCallback(
    async (stroke: Stroke) => {
      if (!token) return;
      try {
        await strokeFn({ data: { token, stroke } });
      } catch {
        /* not the drawer any more */
      }
    },
    [token, strokeFn],
  );

  async function handleGuess(text: string) {
    if (!token) return;
    try {
      await guessFn({ data: { token, text } });
    } catch {
      /* ignore */
    }
  }

  async function handleLeave() {
    if (token) {
      try {
        await leaveFn({ data: { token } });
      } catch {
        /* ignore */
      }
    }
    clearIdentity(upperCode);
    void navigate({ to: "/" });
  }

  if (!ready || loading) {
    return <Centered>Yuklanmoqda…</Centered>;
  }

  if (notFound) {
    return (
      <Centered>
        <p className="text-lg font-semibold">Bunday xona topilmadi</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-4 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-inkdeep"
        >
          Bosh sahifa
        </button>
      </Centered>
    );
  }

  if (!token || !room) {
    return (
      <JoinCard
        code={upperCode}
        onJoined={(t, id) => {
          setToken(t);
          setMeId(id);
          reload();
        }}
      />
    );
  }

  const isHost = room.host_id === meId;

  if (room.status === "lobby") {
    return (
      <Shell>
        <Lobby
          room={room}
          players={players}
          isHost={isHost}
          starting={starting}
          error={error}
          onLeave={handleLeave}
          onStart={async () => {
            setStarting(true);
            setError(null);
            try {
              await startFn({ data: { token } });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Boshlab bo‘lmadi");
            } finally {
              setStarting(false);
            }
          }}
        />
      </Shell>
    );
  }

  if (room.status === "finished") {
    return (
      <Shell>
        <Leaderboard
          players={players}
          isHost={isHost}
          onRestart={async () => {
            try {
              await restartFn({ data: { token } });
            } catch {
              /* ignore */
            }
          }}
          onHome={handleLeave}
        />
      </Shell>
    );
  }

  const wordDisplay = isDrawer
    ? (secretWord ?? "")
    : room.phase === "reveal"
      ? (room.reveal_word ?? "")
      : (room.word_mask ?? "");

  const canGuess = room.phase === "drawing" && !isDrawer && !me?.has_guessed;

  return (
    <Shell game>
      <GameTopBar
        room={room}
        drawer={drawer}
        meId={meId}
        secondsLeft={secondsLeft}
        onLeave={handleLeave}
      />

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:mt-4 lg:grid lg:grid-cols-12 lg:gap-4">
        <aside className="order-2 hidden lg:order-1 lg:col-span-3 lg:block">
          <div className="lg:hidden">
            <button
              onClick={() => setShowPlayers((v) => !v)}
              className="mb-2 w-full rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold outline-1 outline-white/10"
            >
              {showPlayers ? "O‘yinchilarni yashirish" : `O‘yinchilar (${players.length})`}
            </button>
            {showPlayers ? (
              <PlayerPanel players={players} drawerId={room.current_drawer_id} meId={meId} compact />
            ) : null}
          </div>
          <div className="hidden lg:block">
            <PlayerPanel players={players} drawerId={room.current_drawer_id} meId={meId} />
          </div>
        </aside>

        <div className="order-1 min-h-0 flex-1 lg:order-2 lg:col-span-6">
          <div className="panel flex h-full min-h-0 flex-col p-2 lg:block lg:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-coral/15 px-3 py-1 text-xs font-semibold text-coral outline-1 outline-coral/30">
                <span className="size-1.5 rounded-full bg-coral" />
                {isDrawer ? "Siz chizyapsiz" : `${drawer?.nickname ?? "—"} chizmoqda`}
              </span>
              <span className="font-display text-lg font-bold tracking-[0.35em] text-cream">
                {wordDisplay}
              </span>
            </div>

            <div className="relative min-h-0">
              <DrawCanvas
                roomId={room.id}
                turnKey={turnKey}
                strokes={turnStrokes}
                canDraw={isDrawer && room.phase === "drawing"}
                color={color}
                size={size}
                tool={tool}
                onStrokeFinished={handleStroke}
              />

              {room.phase === "choosing" ? (
                <Overlay>
                  {isDrawer ? (
                    <>
                      <p className="text-sm text-cream/70">So‘zni tanlang</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {choices.length === 0 ? (
                          <p className="text-sm text-cream/60">So‘zlar yuklanmoqda…</p>
                        ) : (
                          choices.map((word) => (
                            <button
                              key={word}
                              data-choice="1"
                              disabled={pickedWord !== null}
                              onClick={async () => {
                                if (pickedWord) return;
                                setPickedWord(word);
                                try {
                                  await chooseFn({ data: { token, word } });
                                  setSecretWord(word);
                                } catch {
                                  setPickedWord(null);
                                }
                              }}
                              className={`rounded-xl px-4 py-2 font-display text-base font-bold text-inkdeep transition-transform duration-100 active:scale-95 ${
                                pickedWord === word
                                  ? "bg-teal"
                                  : pickedWord
                                    ? "bg-gold/40"
                                    : "bg-gold hover:brightness-110"
                              }`}
                            >
                              {word}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-cream/70">
                      {drawer?.nickname ?? "O‘yinchi"} so‘z tanlamoqda…
                    </p>
                  )}
                </Overlay>
              ) : null}

              {room.phase === "reveal" ? (
                <Overlay>
                  <p className="text-xs tracking-wider text-cream/60 uppercase">To‘g‘ri javob</p>
                  <p className="mt-1 font-display text-3xl font-extrabold text-gold">
                    {room.reveal_word ?? "—"}
                  </p>
                  <p className="mt-2 text-sm text-cream/60">Keyingi navbat boshlanmoqda…</p>
                </Overlay>
              ) : null}
            </div>

            {isDrawer && room.phase === "drawing" ? (
              <Toolbar
                color={color}
                size={size}
                tool={tool}
                onColor={setColor}
                onSize={setSize}
                onTool={setTool}
                onUndo={() => void undoFn({ data: { token } })}
                onClear={() => void clearFn({ data: { token } })}
              />
            ) : null}
          </div>
        </div>

        <aside className="order-3 h-[30dvh] min-h-0 shrink-0 lg:col-span-3 lg:h-auto">
          <div className="h-full lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)] lg:min-h-[420px]">
            <ChatPanel
              messages={messages}
              disabled={isDrawer}
              placeholder={
                isDrawer
                  ? "Chizuvchi yoza olmaydi"
                  : canGuess
                    ? "Javobingizni yozing…"
                    : "Xabar yozing…"
              }
              onSend={handleGuess}
            />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children, game = false }: { children: React.ReactNode; game?: boolean }) {
  return (
    <main className={`relative overflow-hidden bg-boarddeep ${game ? "h-dvh" : "min-h-screen"}`}>
      <div className="glow-teal pointer-events-none absolute -top-20 right-10 h-72 w-72 rounded-full blur-3xl" />
      <div className="glow-coral pointer-events-none absolute bottom-0 -left-16 h-72 w-72 rounded-full blur-3xl" />
      <div
        className={`relative mx-auto max-w-7xl px-4 ${game ? "flex h-full min-h-0 flex-col py-3 lg:py-6" : "py-6"}`}
      >
        {children}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-boarddeep px-4 text-center text-cream">
      <div>{children}</div>
    </main>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-xl bg-inkdeep/80 text-center backdrop-blur-sm">
      <div className="px-6">{children}</div>
    </div>
  );
}

function JoinCard({
  code,
  onJoined,
}: {
  code: string;
  onJoined: (token: string, playerId: string) => void;
}) {
  const join = useServerFn(joinRoom);
  const [nickname, setNick] = useState(() => getNickname());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Centered>
      <div className="panel w-[min(92vw,26rem)] p-6 text-left">
        <p className="text-xs tracking-wider text-cream/50 uppercase">Xonaga qo‘shilish</p>
        <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.2em] text-gold">
          {code}
        </p>
        <label htmlFor="join-nick" className="mt-5 block text-xs tracking-wider text-cream/50 uppercase">
          Ismingizni kiriting
        </label>
        <input
          id="join-nick"
          value={nickname}
          maxLength={16}
          onChange={(e) => setNick(e.target.value)}
          className="mt-2 w-full rounded-xl bg-inkdeep/60 px-4 py-3 font-display text-lg font-semibold text-cream outline-1 outline-white/10 focus:outline-coral"
        />
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
        <button
          disabled={busy}
          onClick={async () => {
            if (!nickname.trim()) return setError("Ismingizni kiriting");
            setBusy(true);
            setError(null);
            try {
              const result = await join({ data: { nickname: nickname.trim(), code } });
              setNickname(nickname.trim());
              setIdentity(code, { token: result.token, playerId: result.playerId });
              onJoined(result.token, result.playerId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Qo‘shilib bo‘lmadi");
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 w-full rounded-xl bg-coral py-3 text-sm font-semibold text-inkdeep disabled:opacity-50"
        >
          {busy ? "Qo‘shilmoqda…" : "Qo‘shilish"}
        </button>
      </div>
    </Centered>
  );
}
