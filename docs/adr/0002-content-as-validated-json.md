# 0002: Lesson content as validated JSON, separate from code

- Status: accepted
- Date: 2026-10-14

## Context
Content will keep growing and changing as more sources and native-speaker corrections arrive. Pulaar sources are scarce and error-prone to transcribe.

## Decision
Keep content in `content/` as JSON units with JSON Schemas. `tools/validate.py` checks it, and `tools/build.py` compiles it into `app/data.json`. Each item records its sources and a `status`.

## Consequences
- Adding or changing material never touches app code; diffs are reviewable.
- New fields need a schema change plus a `data-catalog.md` update.
- `data.json` is generated, so it must be rebuilt before previewing or deploying.
