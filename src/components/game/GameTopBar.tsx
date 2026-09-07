import type { PlayerState, RoomState } from "@/hooks/useRoomState";

interface Props {
  room: RoomState;
  drawer: PlayerState | undefined;
  meId: string | null;
  secondsLeft: number;
  onLeave: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  waiting: "Kutish",
  choosing: "So‘z tanlanmoqda",
  drawing: "Chizilmoqda",
  reveal: "Javob ochildi",
  finished: "O‘yin tugadi",
};

export function GameTopBar({ room, drawer, meId, secondsLeft, onLeave }: Props) {
  const total = room.phase === "drawing" ? room.round_duration : 15;
  const progress = Math.max(0, Math.min(1, secondsLeft / total));
  const isMe = drawer?.id === meId;

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-inkdeep/50 px-3 py-1.5 text-sm font-semibold outline-1 outline-white/10">
          Xona <span className="text-gold">{room.code}</span>
        </span>
        <span className="rounded-lg bg-inkdeep/50 px-3 py-1.5 text-sm font-medium text-cream/70 outline-1 outline-white/10">
          {Math.max(room.current_round, 1)}/{room.total_rounds} raund
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative grid size-12 place-items-center">
          <div className="absolute inset-0 rounded-full bg-white/5" />
          <div
            className="absolute inset-1 rounded-full"
            style={{
              background: `conic-gradient(var(--color-coral) ${progress * 360}deg, rgba(255,255,255,.08) ${progress * 360}deg)`,
              WebkitMask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
              mask: "radial-gradient(farthest-side, transparent 62%, #000 63%)",
            }}
          />
          <span className="relative font-display text-base font-bold text-cream">
            {Math.max(0, Math.ceil(secondsLeft))}
          </span>
        </div>
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-wider text-cream/45">
            {PHASE_LABEL[room.phase] ?? ""}
          </p>
          <p className="text-sm font-semibold">
            {drawer ? (
              isMe ? (
                <span className="text-coral">Siz chizyapsiz</span>
              ) : (
                <>
                  {drawer.nickname} <span className="text-coral">chizmoqda</span>
                </>
              )
            ) : (
              "Navbat kutilmoqda"
            )}
          </p>
        </div>
      </div>

      <button
        onClick={onLeave}
        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-cream outline-1 outline-white/15 transition-transform hover:-translate-y-0.5"
      >
        Chiqish
      </button>
    </div>
  );
}
