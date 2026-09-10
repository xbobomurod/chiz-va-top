import type { PlayerState } from "@/hooks/useRoomState";
import { Avatar } from "./Avatar";

interface Props {
  players: PlayerState[];
  isHost: boolean;
  onRestart: () => void;
  onHome: () => void;
}

export function Leaderboard({ players, isHost, onRestart, onHome }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="panel mx-auto max-w-lg p-6 text-center">
      <p className="text-xs uppercase tracking-wider text-cream/50">O‘yin tugadi</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold">
        G‘olib: <span className="text-gold">{winner?.nickname ?? "—"}</span>
      </h2>

      <ul className="mt-6 space-y-2 text-left">
        {sorted.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-xl bg-white/5 p-3 outline-1 outline-white/10"
          >
            <span className="font-display text-lg font-bold text-cream/50">{index + 1}</span>
            <Avatar avatar={player.avatar} size={32} title={player.nickname} />
            <span className="flex-1 truncate text-sm font-semibold">{player.nickname}</span>
            <span className="font-display text-lg font-bold text-gold">{player.score}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {isHost ? (
          <button
            onClick={onRestart}
            className="flex-1 rounded-xl bg-coral py-3 text-sm font-semibold text-inkdeep outline-1 outline-coral/60"
          >
            Yana o‘ynash
          </button>
        ) : null}
        <button
          onClick={onHome}
          className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-cream outline-1 outline-white/15"
        >
          Bosh sahifa
        </button>
      </div>
    </div>
  );
}
