# Guide: native-speaker review

A Mauritanian Pulaar speaker is the best way to settle `needs-review` items and to catch regional differences.

1. **Make the checklist:** `uv run tools/review.py` (add `--all` to check everything). Send the Markdown to the speaker.
2. **Register them as a source** in `content/sources.json`:
   ```json
   {"id": "native-<name-or-initials>", "title": "Review by <role>, <date>", "region": "mauritania", "provenance": "native-speaker"}
   ```
   Don't put private details beyond a role or initials in a public repo.
3. **Record the answers:**
   ```
   uv run tools/confirm.py --source native-xx ITEM_ID ITEM_ID --fix ITEM_ID="Corrected text" --clear-notes
   ```
   Confirmed items become `verified` and show a "native-checked" badge. `--fix` replaces the Pulaar text.
4. **If they change the meaning** or say the phrase isn't used, edit the item by hand (or move it to `variants`) instead of confirming it.
5. `uv run tools/validate.py`, rebuild, then commit with `content: confirm greetings with native speaker`.
