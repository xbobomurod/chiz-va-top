# So'zlar bazasi / Word dataset

`words.json` is the single source of truth for the game's words.
Replace this file with a newer dataset any time — no code changes needed.

The loader (`src/lib/words.server.ts`) auto-detects these shapes:

1. Grouped by difficulty:
   `{ "easy": ["olma", ...], "medium": [...], "difficult": [...] }`
2. Grouped by difficulty with objects:
   `{ "oson": [{ "word": "olma", "category": "meva" }], ... }`
3. Flat array:
   `[{ "word": "olma", "difficulty": "easy", "category": "meva" }, ...]`
4. Wrapped: `{ "words": <any of the above> }`

Accepted field aliases: `word | soz | so'z | so‘z | text | name | value`,
`difficulty | daraja | level`, `category | kategoriya | turkum | topic`.

Difficulty aliases (case-insensitive): easy/oson/1, medium/o‘rta/orta/o'rta/2,
difficult/hard/qiyin/3.

Words are stored exactly as written — no normalisation, no de-duplication.
