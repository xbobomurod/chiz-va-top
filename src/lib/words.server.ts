/**
 * Word service — server only.
 * The dataset in src/data/words.json is the single source of truth.
 * The loader adapts to several possible JSON shapes (see src/data/README.md).
 */
import rawDataset from "@/data/words.json";

export type Difficulty = "easy" | "medium" | "difficult";

export interface WordEntry {
  word: string;
  difficulty: Difficulty;
  category: string | null;
}

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  easy: "easy",
  oson: "easy",
  yengil: "easy",
  "1": "easy",
  medium: "medium",
  normal: "medium",
  orta: "medium",
  "o'rta": "medium",
  "o‘rta": "medium",
  "2": "medium",
  difficult: "difficult",
  hard: "difficult",
  qiyin: "difficult",
  murakkab: "difficult",
  "3": "difficult",
};

const WORD_KEYS = ["word", "soz", "so'z", "so‘z", "text", "name", "value", "title"];
const DIFFICULTY_KEYS = ["difficulty", "daraja", "level", "darajasi"];
const CATEGORY_KEYS = ["category", "kategoriya", "turkum", "topic", "guruh"];

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim() !== "") return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

function toDifficulty(value: string | null, fallback: Difficulty): Difficulty {
  if (!value) return fallback;
  return DIFFICULTY_ALIASES[value.trim().toLowerCase()] ?? fallback;
}

function parseItem(item: unknown, fallback: Difficulty): WordEntry | null {
  if (typeof item === "string") {
    const word = item.trim();
    return word ? { word, difficulty: fallback, category: null } : null;
  }
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const word = pick(obj, WORD_KEYS);
    if (!word) return null;
    return {
      word,
      difficulty: toDifficulty(pick(obj, DIFFICULTY_KEYS), fallback),
      category: pick(obj, CATEGORY_KEYS),
    };
  }
  return null;
}

function parseDataset(input: unknown): WordEntry[] {
  const entries: WordEntry[] = [];
  let source = input;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const obj = source as Record<string, unknown>;
    for (const key of ["words", "data", "dataset", "sozlar"]) {
      if (obj[key] !== undefined) {
        source = obj[key];
        break;
      }
    }
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const parsed = parseItem(item, "medium");
      if (parsed) entries.push(parsed);
    }
    return entries;
  }

  if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      const groupDifficulty = toDifficulty(key, "medium");
      const isDifficultyGroup = DIFFICULTY_ALIASES[key.trim().toLowerCase()] !== undefined;
      if (Array.isArray(value)) {
        for (const item of value) {
          const parsed = parseItem(item, groupDifficulty);
          if (!parsed) continue;
          if (!isDifficultyGroup && !parsed.category) parsed.category = key;
          entries.push(parsed);
        }
      } else if (value && typeof value === "object") {
        // difficulty -> category -> words
        for (const [category, list] of Object.entries(value as Record<string, unknown>)) {
          if (!Array.isArray(list)) continue;
          for (const item of list) {
            const parsed = parseItem(item, groupDifficulty);
            if (!parsed) continue;
            if (!parsed.category) parsed.category = category;
            entries.push(parsed);
          }
        }
      }
    }
  }

  return entries;
}

let cache: WordEntry[] | null = null;

export function allWords(): WordEntry[] {
  if (!cache) cache = parseDataset(rawDataset);
  return cache;
}

export function datasetSize(): number {
  return allWords().length;
}

export function categoriesFor(difficulty?: Difficulty | null): string[] {
  const list = allWords().filter((w) => !difficulty || w.difficulty === difficulty);
  return Array.from(
    new Set(list.map((w) => w.category).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "uz"));
}

export function allCategories(): string[] {
  return categoriesFor(null);
}

/** Pick `count` distinct random words matching difficulty/category, with graceful fallbacks. */
export function pickWords(
  difficulty: Difficulty,
  category: string | null,
  count = 3,
): string[] {
  const words = allWords();
  const pools = [
    words.filter(
      (w) => w.difficulty === difficulty && (!category || w.category === category),
    ),
    words.filter((w) => w.difficulty === difficulty),
    category ? words.filter((w) => w.category === category) : [],
    words,
  ];

  const chosen: string[] = [];
  const seen = new Set<string>();
  for (const pool of pools) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const entry of shuffled) {
      if (chosen.length >= count) break;
      const key = entry.word.toLocaleLowerCase("uz");
      if (seen.has(key)) continue;
      seen.add(key);
      chosen.push(entry.word);
    }
    if (chosen.length >= count) break;
  }
  return chosen;
}
