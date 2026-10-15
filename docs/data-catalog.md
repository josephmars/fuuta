# Data catalog

## 1. `content/sources.json` (authored)
Registry of where material came from. Schema: [`schema/sources.schema.json`](../schema/sources.schema.json).

| Field | Type | Notes |
|---|---|---|
| `id` | string | Referenced by items, `^[a-z0-9-]+$` |
| `title` | string | |
| `region` | `mauritania` \| `gambia` \| `senegal` \| `guinea` \| `other` | Drives the verification rule |
| `provenance` | `user-supplied` \| `native-speaker` \| `web` \| `book` | |
| `year`, `local_file`, `url`, `notes` | optional | PDFs stay local (`sources/files/` is gitignored) |

Current sources: `mr-pc-intro` (Peace Corps/Mauritania intro lessons, region `mauritania`), `gm-pc-tape-2013` (Peace Corps Gambia script, region `gambia`, comparison only).

## 2. `content/units/NN-name.json` (authored)
One lesson unit. Schema: [`schema/unit.schema.json`](../schema/unit.schema.json).

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unit id |
| `title`, `description` | string | |
| `order` | integer | Sort order in the app |
| `items` | array of item | At least one |

### Item
| Field | Type | Notes |
|---|---|---|
| `id` | string | Globally unique across all units |
| `pulaar`, `english` | string | NFC-normalized. Pulaar uses ɓ ɗ ŋ ƴ ñ |
| `kind` | `word` \| `phrase` \| `greeting` \| `response` | |
| `status` | `verified` \| `needs-review` \| `unverified` | `verified` requires a source with region `mauritania` |
| `sources` | string[] | Source ids, at least one |
| `french`, `hassaniya`, `tags`, `notes` | optional | `needs-review` should explain why in `notes` |
| `variants` | array of `{source, pulaar, note?}` | Forms from other sources, comparison only |

## 3. `app/data.json` (generated)
Built by `tools/build.py`. `{ "units": [ {id, title, order, description, items: [...]} ] }`. Items keep `id, pulaar, english, french, hassaniya, kind, tags, status, notes`. `unverified` items and `variants` are removed. Gitignored.

## 4. Browser storage (`localStorage["fuuta:v1"]`)
| Key | Type | Notes |
|---|---|---|
| `xp` | number | +2 per flashcard known, 10-20 per correct quiz answer |
| `streak`, `lastDay` | number | `lastDay` is days since epoch, local time |
| `cards` | `{ [itemId]: {box, due} }` | Leitner box 0-5; `due` is a day number. Review gaps (days): 0, 1, 2, 4, 7, 14 |
| `mode` | `p2e` \| `e2p` | Last quiz direction |

A card counts as learned at box 2 or higher. Item ids are the join key, so renaming an id resets that card's progress.

## 5. Service worker cache
Cache name `fuuta-v1` in `app/sw.js`, holding the app shell and `data.json`. Bump the name when shipping breaking changes.
