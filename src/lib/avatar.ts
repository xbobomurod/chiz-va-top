/** Skribbl-style customisable avatar: colour + eyes + mouth + accessory. */

export interface AvatarConfig {
  color: number;
  eyes: number;
  mouth: number;
  hat: number;
}

export const AVATAR_COLORS = [
  "#F4A259",
  "#EF6461",
  "#F6C453",
  "#7FB685",
  "#4FB0C6",
  "#6C7DE0",
  "#B07BD8",
  "#E877A8",
  "#8DD3C7",
  "#C9A227",
  "#9AA0A6",
  "#5FD08A",
];

export const EYES_COUNT = 12;
export const MOUTH_COUNT = 12;
export const HAT_COUNT = 12; // 0 = none

export const AVATAR_PART_LABELS = {
  color: "Rang",
  eyes: "Ko‘z",
  mouth: "Og‘iz",
  hat: "Bosh kiyim",
} as const;

export const AVATAR_PART_COUNTS = {
  color: AVATAR_COLORS.length,
  eyes: EYES_COUNT,
  mouth: MOUTH_COUNT,
  hat: HAT_COUNT,
} as const;

export const DEFAULT_AVATAR: AvatarConfig = { color: 0, eyes: 0, mouth: 0, hat: 0 };

const wrap = (value: number, count: number) => ((value % count) + count) % count;

export function normalizeAvatar(input: unknown): AvatarConfig {
  const raw = (input ?? {}) as Partial<Record<keyof AvatarConfig, unknown>>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0);
  return {
    color: wrap(num(raw.color), AVATAR_COLORS.length),
    eyes: wrap(num(raw.eyes), EYES_COUNT),
    mouth: wrap(num(raw.mouth), MOUTH_COUNT),
    hat: wrap(num(raw.hat), HAT_COUNT),
  };
}

export function randomAvatar(): AvatarConfig {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return {
    color: pick(AVATAR_COLORS.length),
    eyes: pick(EYES_COUNT),
    mouth: pick(MOUTH_COUNT),
    hat: pick(HAT_COUNT),
  };
}

export function shiftAvatarPart(
  avatar: AvatarConfig,
  part: keyof AvatarConfig,
  delta: number,
): AvatarConfig {
  return { ...avatar, [part]: wrap(avatar[part] + delta, AVATAR_PART_COUNTS[part]) };
}

/* ---------------- local storage ---------------- */

const KEY = "chiztop.avatar";

export function getStoredAvatar(): AvatarConfig {
  if (typeof window === "undefined") return DEFAULT_AVATAR;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return randomAvatar();
  try {
    return normalizeAvatar(JSON.parse(raw));
  } catch {
    return DEFAULT_AVATAR;
  }
}

export function storeAvatar(avatar: AvatarConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(avatar));
}

/* ---------------- muted players (local only) ---------------- */

const MUTE_KEY = (code: string) => `chiztop.muted.${code.toUpperCase()}`;

export function getMuted(code: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MUTE_KEY(code));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setMuted(code: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY(code), JSON.stringify(ids));
}
