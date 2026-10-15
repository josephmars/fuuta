# Fuuta

Offline-first PWA for learning everyday Mauritanian Pulaar (greetings, host family, food and market), with French/Hassaniya fallback phrases.

## Content model

```
content/sources.json        where each piece of material came from, and its region
content/units/NN-name.json  one lesson unit, a list of items
schema/*.schema.json        JSON Schemas for both
tools/validate.py           checks everything
```

Each item has `pulaar`, `english`, `kind`, `status`, `sources`, and optionally `french`, `hassaniya`, `tags`, `notes`, and `variants` (forms from other regions, kept for comparison only).

`status`:
- `verified`: matches a Mauritanian source
- `needs-review`: transcribed but doubtful, see `notes`
- `unverified`: not yet checked against a Mauritanian source

To add content: drop a new `content/units/NN-name.json` or add items to an existing one, register any new source in `sources.json`, then run:

```
uv run tools/validate.py
```

## Adding new material safely

1. Add the source to `content/sources.json` with its region.
2. Compare each new item with existing Mauritanian entries. If it differs, keep the Mauritanian form as the main entry and put the other in `variants`.
3. Items from non-Mauritanian sources start as `unverified`.
