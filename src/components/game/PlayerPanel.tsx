import type { PlayerState } from "@/hooks/useRoomState";

const AVATAR_TONES = ["bg-coral", "bg-gold", "bg-teal", "bg-sky", "bg-cream"];

interface Props {
  players: PlayerState[];
  drawerId: string | null;
  meId: string | null;
  compact?: boolean;
}

export function PlayerPanel({ players, drawerId, meId, compact }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="panel p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/50">
        O‘yinchi va ball
      </h3>
      <ul className={`mt-3 space-y-2 ${compact ? "max-h-48 overflow-y-auto" : ""}`}>
        {sorted.map((player, index) => {
          const isDrawer = player.id === drawerId;
          return (
            <li
              key={player.id}
              className={`flex items-center gap-3 rounded-xl p-2.5 outline-1 ${
                isDrawer
                  ? "bg-coral/15 outline-coral/30"
                  : "bg-white/5 outline-white/10"
              } ${player.connected ? "" : "opacity-45"}`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg font-display text-sm font-extrabold text-inkdeep ${
                  AVATAR_TONES[index % AVATAR_TONES.length]
                }`}
              >
                {player.nickname.slice(0, 1).toLocaleUpperCase("uz")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {player.nickname}
                  {player.id === meId ? " (siz)" : ""}
                  {player.is_host ? " ·" : ""}
                  {player.is_host ? <span className="text-gold"> mezbon</span> : null}
                </p>
                <p className="text-[11px] text-cream/45">
                  {!player.connected
                    ? "Uzildi"
                    : isDrawer
                      ? <span className="text-coral">Chizmoqda</span>
                      : player.has_guessed
                        ? <span className="text-teal">Topdi</span>
                        : "Kutilmoqda"}
                </p>
              </div>
              <span className="font-display text-base font-bold">{player.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
