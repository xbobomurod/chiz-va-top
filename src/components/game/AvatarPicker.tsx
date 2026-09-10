import { Avatar } from "./Avatar";
import {
  AVATAR_PART_LABELS,
  randomAvatar,
  shiftAvatarPart,
  type AvatarConfig,
} from "@/lib/avatar";

interface Props {
  avatar: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  size?: number;
}

const PARTS: (keyof AvatarConfig)[] = ["color", "eyes", "mouth", "hat"];

export function AvatarPicker({ avatar, onChange, size = 96 }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid shrink-0 place-items-center rounded-2xl bg-inkdeep/60 p-2 outline-1 outline-white/10">
        <Avatar avatar={avatar} size={size} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {PARTS.map((part) => (
          <div key={part} className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`${AVATAR_PART_LABELS[part]} — oldingi`}
              onClick={() => onChange(shiftAvatarPart(avatar, part, -1))}
              className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-sm text-cream outline-1 outline-white/15"
            >
              ‹
            </button>
            <span className="min-w-0 flex-1 truncate text-center text-[11px] tracking-wider text-cream/55 uppercase">
              {AVATAR_PART_LABELS[part]}
            </span>
            <button
              type="button"
              aria-label={`${AVATAR_PART_LABELS[part]} — keyingi`}
              onClick={() => onChange(shiftAvatarPart(avatar, part, 1))}
              className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-sm text-cream outline-1 outline-white/15"
            >
              ›
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="mt-1 w-full rounded-lg bg-gold/20 py-1.5 text-[11px] font-semibold text-gold outline-1 outline-gold/30"
        >
          Tasodifiy
        </button>
      </div>
    </div>
  );
}
