/**
 * Uzbek-aware text helpers.
 * Words themselves are never modified — normalisation is only used for
 * comparing a guess with the secret word.
 */

const APOSTROPHES = /[\u2018\u2019\u02BB\u02BC\u0060\u00B4\u2032']/g;

/** Canonical apostrophe used only for comparison (o‘, g‘ variants unified). */
export function normalizeGuess(input: string): string {
  return input
    .toLocaleLowerCase("uz")
    .replace(APOSTROPHES, "'")
    .replace(/[.,!?;:()"«»\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function guessMatches(guess: string, secret: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(secret);
}

/** How close a wrong guess is — used for the "yaqin" hint. */
export function isClose(guess: string, secret: string): boolean {
  const a = normalizeGuess(guess);
  const b = normalizeGuess(secret);
  if (a === b || Math.abs(a.length - b.length) > 2) return false;
  const distance = levenshtein(a, b);
  return distance > 0 && distance <= (b.length > 6 ? 2 : 1);
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      last = tmp;
    }
  }
  return prev[b.length]!;
}

/** Masked hint: letters hidden, spaces and separators visible. */
export function buildMask(word: string, revealIndexes: number[] = []): string {
  const revealed = new Set(revealIndexes);
  return Array.from(word)
    .map((ch, i) => {
      if (/\s/.test(ch)) return " ";
      if (/[-–—]/.test(ch)) return ch;
      if (revealed.has(i)) return ch;
      return "_";
    })
    .join("");
}

/** Indexes of maskable letters in a word. */
export function letterIndexes(word: string): number[] {
  return Array.from(word)
    .map((ch, i) => (/[\s\-–—]/.test(ch) ? -1 : i))
    .filter((i) => i >= 0);
}
