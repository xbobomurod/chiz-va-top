import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createRoom, joinRoom } from "@/lib/game.functions";
import { getNickname, setIdentity, setNickname } from "@/lib/identity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chiz & Top — o‘zbekcha chizish va topish o‘yini" },
      {
        name: "description",
        content:
          "Do‘stlaringiz bilan onlayn o‘ynang: bir kishi chizadi, qolganlar so‘zni topadi. Xona oching yoki kod bilan qo‘shiling.",
      },
      { property: "og:title", content: "Chiz & Top — o‘zbekcha chizish o‘yini" },
      {
        property: "og:description",
        content: "Onlayn chizish va so‘z topish o‘yini. 2–10 o‘yinchi, real vaqt rejimida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Mode = "none" | "create" | "join";

function Home() {
  const navigate = useNavigate();
  const create = useServerFn(createRoom);
  const join = useServerFn(joinRoom);

  const [nickname, setNick] = useState(() => getNickname());
  const [mode, setMode] = useState<Mode>("none");
  const [code, setCode] = useState("");
  const [rounds, setRounds] = useState(3);
  const [duration, setDuration] = useState(80);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "difficult">("easy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!nickname.trim()) return setError("Ismingizni kiriting");
    setBusy(true);
    setError(null);
    try {
      const result = await create({
        data: {
          nickname: nickname.trim(),
          totalRounds: rounds,
          roundDuration: duration,
          maxPlayers,
          difficulty,
          category: null,
        },
      });
      setNickname(nickname.trim());
      setIdentity(result.code, { token: result.token, playerId: result.playerId });
      void navigate({ to: "/xona/$code", params: { code: result.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!nickname.trim()) return setError("Ismingizni kiriting");
    if (code.trim().length < 4) return setError("Xona kodini kiriting");
    setBusy(true);
    setError(null);
    try {
      const result = await join({
        data: { nickname: nickname.trim(), code: code.trim().toUpperCase() },
      });
      setNickname(nickname.trim());
      setIdentity(result.code, { token: result.token, playerId: result.playerId });
      void navigate({ to: "/xona/$code", params: { code: result.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Qo‘shilib bo‘lmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-inkdeep">
      <div className="glow-coral pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl" />
      <div className="glow-gold pointer-events-none absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full blur-3xl" />
      <div className="glow-teal pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <nav className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-coral font-display text-lg font-extrabold text-inkdeep">
            C
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Chiz&nbsp;<span className="text-gold">&amp;</span>&nbsp;Top
          </span>
        </nav>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gold outline-1 outline-white/10">
              <span className="size-1.5 rounded-full bg-gold" /> O‘zbekcha chizish o‘yini
            </span>
            <h1 className="mt-5 max-w-[20ch] text-4xl leading-none font-extrabold text-balance sm:text-6xl">
              Chiz, top va <span className="text-coral">g‘olib</span> bo‘l
            </h1>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-pretty text-cream/70">
              Do‘stlar bilan onlayn chizish va topish o‘yini. Bir necha soniyada xona oching,
              so‘zni chizing va kim tezroq topishini ko‘ring.
            </p>

            <div className="mt-7 max-w-md panel p-4">
              <label
                htmlFor="nickname"
                className="text-xs font-medium tracking-wider text-cream/50 uppercase"
              >
                Ismingizni kiriting
              </label>
              <input
                id="nickname"
                value={nickname}
                maxLength={16}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Masalan: Bektosh"
                className="mt-2 w-full rounded-xl bg-inkdeep/60 px-4 py-3 font-display text-lg font-semibold text-cream outline-1 outline-white/10 placeholder:text-cream/30 focus:outline-coral"
              />

              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={() => setMode(mode === "create" ? "none" : "create")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-coral py-3 text-sm font-semibold text-inkdeep outline-1 outline-coral/60 transition-transform hover:-translate-y-0.5"
                >
                  + Xona yaratish
                </button>
                <button
                  onClick={() => setMode(mode === "join" ? "none" : "join")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-cream outline-1 outline-white/15 transition-transform hover:-translate-y-0.5"
                >
                  Xonaga qo‘shilish
                </button>
              </div>

              {mode === "create" ? (
                <div className="mt-4 space-y-3 rounded-xl bg-inkdeep/50 p-4 outline-1 outline-white/10">
                  <Field label={`Raundlar: ${rounds}`}>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={rounds}
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="w-full accent-coral"
                    />
                  </Field>
                  <Field label={`Raund vaqti: ${duration} soniya`}>
                    <input
                      type="range"
                      min={30}
                      max={180}
                      step={10}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full accent-coral"
                    />
                  </Field>
                  <Field label={`Maksimal o‘yinchi: ${maxPlayers}`}>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full accent-coral"
                    />
                  </Field>
                  <Field label="Daraja">
                    <div className="flex gap-2">
                      {(
                        [
                          ["easy", "Oson"],
                          ["medium", "O‘rta"],
                          ["difficult", "Qiyin"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setDifficulty(value)}
                          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                            difficulty === value
                              ? "bg-gold text-inkdeep"
                              : "bg-white/5 text-cream/70 outline-1 outline-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <button
                    onClick={handleCreate}
                    disabled={busy}
                    className="w-full rounded-xl bg-coral py-3 text-sm font-semibold text-inkdeep disabled:opacity-50"
                  >
                    {busy ? "Yaratilmoqda…" : "Yaratish va lobbiga o‘tish"}
                  </button>
                </div>
              ) : null}

              {mode === "join" ? (
                <div className="mt-4 space-y-3 rounded-xl bg-inkdeep/50 p-4 outline-1 outline-white/10">
                  <Field label="Xona kodi">
                    <input
                      value={code}
                      maxLength={8}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="ABC12"
                      className="w-full rounded-lg bg-inkdeep px-3 py-2.5 font-display text-lg tracking-[0.25em] text-cream outline-1 outline-white/10 placeholder:text-cream/25 focus:outline-teal"
                    />
                  </Field>
                  <button
                    onClick={handleJoin}
                    disabled={busy}
                    className="w-full rounded-xl bg-teal py-3 text-sm font-semibold text-inkdeep disabled:opacity-50"
                  >
                    {busy ? "Qo‘shilmoqda…" : "Qo‘shilish"}
                  </button>
                </div>
              ) : null}

              {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="panel p-6">
              <h2 className="text-xl font-bold">Qanday o‘ynash kerak</h2>
              <ul className="mt-4 space-y-3">
                <Step tone="coral" index={1}>
                  Ismingizni kiriting va xona yarating yoki kod bilan qo‘shiling.
                </Step>
                <Step tone="gold" index={2}>
                  Navbatingizda uch so‘zdan birini tanlab, uni chizing.
                </Step>
                <Step tone="teal" index={3}>
                  Do‘stlaringiz topadi — tez topganlar ko‘proq ball oladi.
                </Step>
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-cream/60 outline-1 outline-white/10">
                  2–10 o‘yinchi
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-cream/60 outline-1 outline-white/10">
                  Oson · O‘rta · Qiyin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium tracking-wider text-cream/50 uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function Step({
  index,
  tone,
  children,
}: {
  index: number;
  tone: "coral" | "gold" | "teal";
  children: React.ReactNode;
}) {
  const tones = {
    coral: "bg-coral/15 text-coral",
    gold: "bg-gold/15 text-gold",
    teal: "bg-teal/15 text-teal",
  } as const;
  return (
    <li className="flex gap-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${tones[tone]}`}
      >
        {index}
      </span>
      <p className="text-sm leading-relaxed text-cream/75">{children}</p>
    </li>
  );
}
