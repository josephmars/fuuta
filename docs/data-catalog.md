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
| `usage` | optional string | When/with whom it is used; shown to learners as "When to use". Must be grounded in a source |
| `french`, `hassaniya`, `tags`, `notes` | optional | `notes` is internal (e.g. why `needs-review`); `usage` is the learner-facing one |
| `variants` | array of `{source, pulaar, note?}` | Forms from other sources, comparison only |

## 3. `app/data.json` (generated)
Built by `tools/build.py`. `{ "units": [ {id, title, order, description, items: [...]} ] }`. Items keep `id, pulaar, english, french, hassaniya, kind, tags, status, usage, notes`. `unverified` items and `variants` are removed. Gitignored.

## 4. Browser storage (`localStorage["fuuta:v1"]`)
| Key | Type | Notes |
|---|---|---|
| `xp` | number | +2 per flashcard known, 10-20 per correct quiz answer |
| `streak`, `lastDay` | number | `lastDay` is days since epoch, local time |
| `cards` | `{ [itemId]: {box, due} }` | Leitner box 0-5; `due` is a day number. Review gaps (days): 0, 1, 2, 4, 7, 14 |
| `notes` | `{ [itemId]: string }` | Personal notes, max 2000 chars each, only on this device |
| `mode` | `p2e` \| `e2p` | Last quiz direction |

A card counts as learned at box 2 or higher. Item ids are the join key, so renaming an id resets that card's progress.

## 5. Service worker cache
Cache name `fuuta-v2` in `app/sw.js`, holding the app shell and `data.json`. Bump the name when shipping breaking changes.

## 6. Backup file / code
Produced by Progress > Backup (Save file or Copy code), accepted by Restore.

```json
{ "app": "fuuta", "version": 1, "exportedAt": "ISO-8601",
  "data": { "xp": 0, "streak": 0, "lastDay": null, "cards": {}, "notes": {}, "mode": "p2e" } }
```
On restore the file is validated (app/version, numeric fields, box 0-5; invalid cards are dropped, notes are truncated), then replaces current progress after a second tap to confirm. Bump `version` and add a migration if the stored shape changes.
