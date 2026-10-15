# Fuuta docs

Documentation lives in the repo and changes in the same commit as the code it describes.

| Path | What it covers |
|---|---|
| [architecture.md](architecture.md) | How content, tooling and the app fit together |
| [data-catalog.md](data-catalog.md) | Every data source and its schema |
| [adr/](adr/) | Architectural Decision Records, numbered, never rewritten (supersede instead) |
| [guides/](guides/) | How-tos: adding content, running and deploying |

## Rules
- Change a schema, data shape or storage key: update `data-catalog.md`.
- Change structure or data flow: update `architecture.md`.
- Make a decision that is hard to reverse or that you'd have to re-explain: add an ADR.
- Commit docs with conventional commits (`docs:`), or in the same `feat:`/`fix:` commit as the change.
