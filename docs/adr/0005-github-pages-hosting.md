# 0005: Host on GitHub Pages via GitHub Actions

- Status: accepted
- Date: 2026-10-14

## Context
Installing the PWA and using it offline needs HTTPS. `data.json` is generated and gitignored, so hosting must run the build.

## Decision
Deploy `app/` to GitHub Pages with a GitHub Actions workflow that runs `uv run tools/build.py` (which validates content first) on every push to `main`. All asset paths are relative so the app works under the `/fuuta/` subpath.

## Consequences
- Free HTTPS hosting; invalid content can't be deployed.
- The published site is public by URL even when the repo is private, and private-repo Pages needs a paid plan. The lessons are transcribed from Peace Corps material, so check its redistribution terms before making the site public.
- Phones refresh content in the background after the first load (service worker is stale-while-revalidate), so a new deploy shows up on the second open.
