import { useState } from "react";

import { Avatar } from "./Avatar";
import type { PlayerState } from "@/hooks/useRoomState";

interface Props {
  players: PlayerState[];
  drawerId: string | null;
  meId: string | null;
  compact?: boolean;
  mutedIds?: string[];
  onToggleMute?: (playerId: string) => void;
  onVotekick?: (playerId: string) => void;
  onReport?: (playerId: string) => void;
  actionNote?: string | null;
}

export function PlayerPanel({
  players,
  drawerId,
  meId,
  compact = false,
  mutedIds = [],
  onToggleMute,
  onVotekick,
  onReport,
  actionNote,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const canAct = !!(onToggleMute || onVotekick || onReport);

  return (
    <div className={`panel ${compact ? "p-2" : "p-3"}`}>
      {!compact ? (
        <p className="px-1 pb-2 text-xs tracking-wider text-cream/45 uppercase">O‘yinchilar</p>
      ) : null}
      {actionNote ? <p className="px-1 pb-2 text-xs text-gold">{actionNote}</p> : null}
      <ul className="space-y-1.5">
        {sorted.map((player, index) => {
          const isMe = player.id === meId;
          const muted = mutedIds.includes(player.id);
          const open = openId === player.id;
          return (
            <li key={player.id} className="rounded-xl bg-white/5 outline-1 outline-white/10">
              <div
                className={`flex items-center gap-2 p-2 ${player.connected ? "" : "opacity-45"} ${
                  player.id === drawerId ? "rounded-t-xl bg-coral/15" : ""
                }`}
              >
                <span className="w-4 shrink-0 text-center font-display text-xs font-bold text-cream/40">
                  {index + 1}
                </span>
                <Avatar avatar={player.avatar} size={compact ? 28 : 34} title={player.nickname} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {player.nickname}
                    {isMe ? <span className="text-cream/45"> (siz)</span> : null}
                  </p>
                  <p className="truncate text-[11px] text-cream/45">
                    {player.id === drawerId
                      ? "chizmoqda ✏️"
                      : player.has_guessed
                        ? "topdi ✓"
                        : muted
                          ? "ovozi o‘chirilgan"
                          : player.is_host
                            ? "mezbon"
                            : player.connected
                              ? "o‘ynamoqda"
                              : "uzildi"}
                  </p>
                </div>
                <span className="font-display text-sm font-bold text-gold">{player.score}</span>
                {canAct && !isMe ? (
                  <button
                    type="button"
                    aria-label={`${player.nickname} uchun amallar`}
                    onClick={() => setOpenId(open ? null : player.id)}
                    className="grid size-6 shrink-0 place-items-center rounded-md bg-white/10 text-xs text-cream/70"
                  >
                    ⋯
                  </button>
                ) : null}
              </div>

              {open && canAct && !isMe ? (
                <div className="flex gap-1.5 border-t border-white/10 p-1.5">
                  {onToggleMute ? (
                    <button
                      type="button"
                      onClick={() => onToggleMute(player.id)}
                      className="flex-1 rounded-lg bg-white/10 py-1.5 text-[11px] font-semibold"
                    >
                      {muted ? "Ovozni yoqish" : "Mute"}
                    </button>
                  ) : null}
                  {onVotekick ? (
                    <button
                      type="button"
                      onClick={() => {
                        onVotekick(player.id);
                        setOpenId(null);
                      }}
                      className="flex-1 rounded-lg bg-coral/20 py-1.5 text-[11px] font-semibold text-coral"
                    >
                      Votekick
                    </button>
                  ) : null}
                  {onReport ? (
                    <button
                      type="button"
                      onClick={() => {
                        onReport(player.id);
                        setOpenId(null);
                      }}
                      className="flex-1 rounded-lg bg-gold/20 py-1.5 text-[11px] font-semibold text-gold"
                    >
                      Shikoyat
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
