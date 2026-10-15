# Fuuta

Mauritanian Pulaar phrase/lesson PWA for a trip. Content lives in `content/`, not in code.

- Validate content before committing: `uv run tools/validate.py`
- Use `uv` for all Python; no pip/venv.
- **Only Mauritanian Pulaar.** Material from other countries (Gambia, Senegal, Guinea...) goes in an item's `variants` for comparison, and an item may be `verified` only if it has a Mauritanian source. The validator enforces this.
- Pulaar uses ɓ ɗ ŋ ƴ ñ. PDF text extraction drops them; transcribe from the rendered page and mark doubtful items `needs-review` with a note.
- Do not commit source PDFs (`sources/files/` is gitignored); register them in `content/sources.json`.
