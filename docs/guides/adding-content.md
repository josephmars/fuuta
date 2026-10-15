# Guide: adding or changing content

1. **Register the source** in `content/sources.json` (id, title, `region`, `provenance`). Keep PDFs in `sources/files/` (not committed).
2. **Add items** to an existing unit in `content/units/`, or create `NN-name.json` (`order` sets its place in the app).
3. **Pick a status:**
   - Matches a Mauritanian source: `verified`.
   - Unsure of a letter or meaning: `needs-review` plus a `notes` explanation.
   - Not from a Mauritanian source: `unverified`, and it won't appear in the app.
4. **Compare with existing entries.** If another region differs, keep the Mauritanian form as the main entry and add the other under `variants`.
5. **Usage notes:** add `usage` only when a source says when or how the item is used (e.g. it is the reply to a greeting). Don't invent etiquette; put open questions in `notes`.
6. **Never rename an item `id`** once it exists: learners' progress and notes are keyed by it.
7. **Special letters:** copy ɓ ɗ ŋ ƴ ñ from the rendered page. PDF text extraction drops them.
8. **Validate and rebuild:**
   ```
   uv run tools/validate.py
   uv run tools/build.py
   ```
9. **Update docs** if you changed a schema ([data-catalog.md](../data-catalog.md)), then commit, e.g. `content: add market phrases` or `content: confirm greetings with native speaker`.
