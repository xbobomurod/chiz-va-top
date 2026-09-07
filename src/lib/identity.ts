/** Local player identity — a private token per room, kept in the browser. */

const NICK_KEY = "chiztop.nickname";
const roomKey = (code: string) => `chiztop.room.${code.toUpperCase()}`;

export interface StoredIdentity {
  token: string;
  playerId: string;
}

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NICK_KEY) ?? "";
}

export function setNickname(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NICK_KEY, name);
}

export function getIdentity(code: string): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(roomKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function setIdentity(code: string, identity: StoredIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(roomKey(code), JSON.stringify(identity));
}

export function clearIdentity(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(roomKey(code));
}
