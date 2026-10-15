# Fuuta

Mauritanian Pulaar phrase/lesson PWA for a trip. Content lives in `content/`, not in code.

- Validate content before committing: `uv run tools/validate.py`
- Use `uv` for all Python; no pip/venv.
- **Only Mauritanian Pulaar.** Material from other countries (Gambia, Senegal, Guinea...) goes in an item's `variants` for comparison, and an item may be `verified` only if it has a Mauritanian source. The validator enforces this.
- Pulaar uses ɓ ɗ ŋ ƴ ñ. PDF text extraction drops them; transcribe from the rendered page and mark doubtful items `needs-review` with a note.
- Do not commit source PDFs (`sources/files/` is gitignored); register them in `content/sources.json`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `content:`, `docs:`, `chore:`, `refactor:`); use `content:` for lesson data changes.
- `app/` is a no-build static PWA (vanilla JS). `app/data.json` is generated: run `uv run tools/build.py` after any content change. Preview with `uv run python -m http.server -d app 8000`.
- UI style follows the Dialect app: olive green, warm cream, gold accent, big bold card text, bottom tab bar.
- Docs as code: keep `docs/` (architecture, data-catalog, adr/, guides/) updated in the same commit as the change. Schema or storage change: update `docs/data-catalog.md`. Hard-to-reverse decision: add a numbered ADR in `docs/adr/`.
