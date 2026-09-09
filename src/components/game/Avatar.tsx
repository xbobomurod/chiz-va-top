import { AVATAR_COLORS, normalizeAvatar, type AvatarConfig } from "@/lib/avatar";

interface Props {
  avatar: unknown;
  size?: number;
  className?: string;
  title?: string;
}

const INK = "#0a1822";

function Eyes({ variant }: { variant: number }) {
  const L = 36;
  const R = 64;
  const y = 44;
  switch (variant) {
    case 0:
      return (
        <>
          <circle cx={L} cy={y} r="5" fill={INK} />
          <circle cx={R} cy={y} r="5" fill={INK} />
        </>
      );
    case 1:
      return (
        <>
          <circle cx={L} cy={y} r="7" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={R} cy={y} r="7" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={L + 2} cy={y} r="3" fill={INK} />
          <circle cx={R + 2} cy={y} r="3" fill={INK} />
        </>
      );
    case 2:
      return (
        <>
          <path d={`M${L - 7} ${y} q7 -9 14 0`} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d={`M${R - 7} ${y} q7 -9 14 0`} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 3:
      return (
        <>
          <path d={`M${L - 7} ${y - 4} q7 9 14 0`} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d={`M${R - 7} ${y - 4} q7 9 14 0`} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 4:
      return (
        <>
          <rect x={L - 5} y={y - 6} width="10" height="12" rx="2" fill={INK} />
          <rect x={R - 5} y={y - 6} width="10" height="12" rx="2" fill={INK} />
        </>
      );
    case 5:
      return (
        <>
          <circle cx={L} cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={R} cy={y} r="8" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={L - 3} cy={y + 2} r="3.5" fill={INK} />
          <circle cx={R - 3} cy={y + 2} r="3.5" fill={INK} />
        </>
      );
    case 6:
      return (
        <>
          <circle cx={L} cy={y} r="4" fill={INK} />
          <path d={`M${R - 7} ${y} h14`} stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 7:
      return (
        <>
          <path d={`M${L - 8} ${y - 8} l16 16 M${L + 8} ${y - 8} l-16 16`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${R - 8} ${y - 8} l16 16 M${R + 8} ${y - 8} l-16 16`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 8:
      return (
        <>
          <ellipse cx={L} cy={y} rx="4" ry="8" fill={INK} />
          <ellipse cx={R} cy={y} rx="4" ry="8" fill={INK} />
        </>
      );
    case 9:
      return (
        <>
          <circle cx={L} cy={y} r="6" fill={INK} />
          <circle cx={R} cy={y} r="6" fill={INK} />
          <path d={`M${L - 9} ${y - 11} q9 -5 18 -1`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${R + 9} ${y - 11} q-9 -5 -18 -1`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case 10:
      return (
        <>
          <circle cx={L} cy={y} r="7" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={R} cy={y} r="7" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx={L} cy={y - 3} r="3" fill={INK} />
          <circle cx={R} cy={y - 3} r="3" fill={INK} />
        </>
      );
    default:
      return (
        <>
          <path d={`M${L - 8} ${y} h16`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d={`M${R - 8} ${y} h16`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </>
      );
  }
}

function Mouth({ variant }: { variant: number }) {
  const y = 66;
  switch (variant) {
    case 0:
      return <path d={`M36 ${y} q14 12 28 0`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 1:
      return <path d={`M36 ${y + 6} q14 -12 28 0`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 2:
      return <ellipse cx="50" cy={y + 2} rx="9" ry="11" fill={INK} />;
    case 3:
      return <path d={`M38 ${y} h24`} stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case 4:
      return (
        <>
          <path d={`M34 ${y - 2} q16 16 32 0 z`} fill={INK} />
          <path d={`M42 ${y + 6} q8 8 16 0`} fill="#EF6461" />
        </>
      );
    case 5:
      return (
        <>
          <path d={`M36 ${y} q14 12 28 0`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="44" y={y + 1} width="12" height="6" rx="1" fill="#fff" stroke={INK} strokeWidth="1.5" />
        </>
      );
    case 6:
      return <circle cx="50" cy={y + 2} r="6" fill={INK} />;
    case 7:
      return <path d={`M36 ${y} q7 10 14 0 q7 -10 14 0`} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    case 8:
      return (
        <>
          <path d={`M36 ${y} q14 14 28 0 z`} fill={INK} />
          <path d={`M50 ${y} v10`} stroke="#fff" strokeWidth="2" />
        </>
      );
    case 9:
      return <path d={`M40 ${y} q10 -10 20 2`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 10:
      return (
        <>
          <path d={`M36 ${y} q14 12 28 0`} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d={`M42 ${y - 8} q8 -4 16 0`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    default:
      return <rect x="38" y={y - 2} width="24" height="10" rx="5" fill={INK} />;
  }
}

function Hat({ variant }: { variant: number }) {
  switch (variant) {
    case 0:
      return null;
    case 1: // do‘ppi
      return (
        <>
          <path d="M24 26 q26 -22 52 0 z" fill="#1b3a5c" />
          <path d="M22 26 h56 v5 h-56 z" fill="#0f2740" />
          <path d="M36 20 l4 -6 4 6 M56 20 l4 -6 4 6" stroke="#e8e2d0" strokeWidth="2" fill="none" />
        </>
      );
    case 2: // silindr
      return (
        <>
          <rect x="34" y="0" width="32" height="24" fill="#12202e" />
          <rect x="22" y="22" width="56" height="6" rx="3" fill="#12202e" />
        </>
      );
    case 3: // ko‘zoynak
      return (
        <>
          <circle cx="36" cy="44" r="12" fill="none" stroke={INK} strokeWidth="3" />
          <circle cx="64" cy="44" r="12" fill="none" stroke={INK} strokeWidth="3" />
          <path d="M48 44 h4" stroke={INK} strokeWidth="3" />
        </>
      );
    case 4: // toj
      return <path d="M28 26 l4 -18 9 10 9 -14 9 14 9 -10 4 18 z" fill="#F6C453" stroke="#c99b1f" strokeWidth="2" />;
    case 5: // tasma
      return <path d="M22 26 q28 -12 56 0 v5 h-56 z" fill="#EF6461" />;
    case 6: // beysbolka
      return (
        <>
          <path d="M26 26 q24 -24 48 0 z" fill="#4FB0C6" />
          <path d="M74 24 q14 2 14 8 h-20 z" fill="#3a8fa1" />
        </>
      );
    case 7: // qulоqchin
      return (
        <>
          <path d="M22 44 q0 -30 28 -30 q28 0 28 30" fill="none" stroke="#6C7DE0" strokeWidth="6" />
          <rect x="14" y="38" width="14" height="18" rx="7" fill="#6C7DE0" />
          <rect x="72" y="38" width="14" height="18" rx="7" fill="#6C7DE0" />
        </>
      );
    case 8: // gul
      return (
        <>
          <circle cx="72" cy="18" r="6" fill="#E877A8" />
          <circle cx="82" cy="22" r="6" fill="#E877A8" />
          <circle cx="77" cy="28" r="6" fill="#E877A8" />
          <circle cx="77" cy="22" r="3.5" fill="#F6C453" />
        </>
      );
    case 9: // shox
      return (
        <>
          <path d="M32 18 l-8 -14 14 6" fill="#9AA0A6" />
          <path d="M68 18 l8 -14 -14 6" fill="#9AA0A6" />
        </>
      );
    case 10: // qishki qalpoq
      return (
        <>
          <path d="M26 28 q24 -28 48 0 z" fill="#EF6461" />
          <rect x="22" y="26" width="56" height="8" rx="4" fill="#f4efe2" />
          <circle cx="50" cy="2" r="6" fill="#f4efe2" />
        </>
      );
    default: // naushnik
      return (
        <>
          <path d="M24 46 q0 -28 26 -28 q26 0 26 28" fill="none" stroke="#12202e" strokeWidth="6" />
          <rect x="16" y="40" width="14" height="20" rx="6" fill="#12202e" />
          <rect x="70" y="40" width="14" height="20" rx="6" fill="#12202e" />
        </>
      );
  }
}

export function Avatar({ avatar, size = 36, className = "", title }: Props) {
  const cfg: AvatarConfig = normalizeAvatar(avatar);
  const fill = AVATAR_COLORS[cfg.color] ?? AVATAR_COLORS[0];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={title ?? "Avatar"}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="50" cy="52" r="42" fill={fill} stroke={INK} strokeWidth="3" />
      <Eyes variant={cfg.eyes} />
      <Mouth variant={cfg.mouth} />
      <Hat variant={cfg.hat} />
    </svg>
  );
}
