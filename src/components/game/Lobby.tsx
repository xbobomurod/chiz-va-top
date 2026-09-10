import { useState } from "react";
import type { PlayerState, RoomState } from "@/hooks/useRoomState";
import type { AvatarConfig } from "@/lib/avatar";
import { Avatar } from "./Avatar";
import { AvatarPicker } from "./AvatarPicker";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Oson",
  medium: "O‘rta",
  difficult: "Qiyin",
};

interface Props {
  room: RoomState;
  players: PlayerState[];
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
  starting: boolean;
  error: string | null;
  avatar: AvatarConfig;
  onAvatarChange: (next: AvatarConfig) => void;
}

export function Lobby({
  room,
  players,
  isHost,
  onStart,
  onLeave,
  starting,
  error,
  avatar,
  onAvatarChange,
}: Props) {
  const [copied, setCopied] = useState(false);
  const connected = players.filter((p) => p.connected);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
      <div className="panel p-6">
        <p className="text-xs uppercase tracking-wider text-cream/50">Xona kodi</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-display text-4xl font-extrabold tracking-[0.2em] text-gold">
            {room.code}
          </span>
          <button
            onClick={copyCode}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold outline-1 outline-white/15"
          >
            {copied ? "Nusxalandi" : "Nusxalash"}
          </button>
        </div>
        <p className="mt-3 text-sm text-cream/60">
          Kodni do‘stlaringizga yuboring — ular “Xonaga qo‘shilish” orqali kiradi.
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3 outline-1 outline-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-cream/45">Raundlar</dt>
            <dd className="font-display text-lg font-bold">{room.total_rounds}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3 outline-1 outline-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-cream/45">Vaqt</dt>
            <dd className="font-display text-lg font-bold">{room.round_duration} s</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3 outline-1 outline-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-cream/45">Daraja</dt>
            <dd className="font-display text-lg font-bold">
              {DIFFICULTY_LABEL[room.difficulty] ?? room.difficulty}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3 outline-1 outline-white/10">
            <dt className="text-[11px] uppercase tracking-wider text-cream/45">O‘yinchilar</dt>
            <dd className="font-display text-lg font-bold">
              {connected.length}/{room.max_players}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-xl bg-white/5 p-4 outline-1 outline-white/10">
          <p className="pb-3 text-[11px] tracking-wider text-cream/45 uppercase">
            Avatarni sozlash
          </p>
          <AvatarPicker avatar={avatar} onChange={onAvatarChange} size={84} />
        </div>
      </div>

      <div className="panel flex flex-col p-6">
        <h2 className="font-display text-xl font-bold">Xonadagilar</h2>
        <ul className="mt-4 flex-1 space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 outline-1 outline-white/10 ${
                player.connected ? "" : "opacity-45"
              }`}
            >
              <Avatar avatar={player.avatar} size={34} title={player.nickname} />
              <span className="flex-1 truncate text-sm font-semibold">{player.nickname}</span>
              {player.is_host ? (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold">
                  Mezbon
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={connected.length < 2 || starting}
              className="flex-1 rounded-xl bg-coral py-3 text-sm font-semibold text-inkdeep outline-1 outline-coral/60 disabled:opacity-40"
            >
              {connected.length < 2 ? "Kamida 2 o‘yinchi kerak" : "O‘yinni boshlash"}
            </button>
          ) : (
            <p className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm text-cream/60 outline-1 outline-white/10">
              Mezbon boshlashini kuting…
            </p>
          )}
          <button
            onClick={onLeave}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold outline-1 outline-white/15"
          >
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}
