# Guide: running and deploying

## Run locally
```
uv run tools/build.py
uv run python -m http.server -d app 8000
```
Open http://localhost:8000. Rebuild after any content change.

## Try it on your phone
Serve on your network (`-b 0.0.0.0`) and open `http://<your-mac-ip>:8000` from the same Wi-Fi. Service workers and "install" need HTTPS, so this only tests the UI.

## Deploy (GitHub Pages)
`.github/workflows/pages.yml` runs on every push to `main`: it validates content, builds `app/data.json` and publishes `app/`. A content error fails the deploy.

One-time setup: repo Settings > Pages > Build and deployment > Source: **GitHub Actions**. The site is then at `https://<user>.github.io/fuuta/`.

Note: a Pages site is public to anyone with the URL, even if the repo is private, and Pages on a private repo needs a paid GitHub plan. See [ADR 0005](../adr/0005-github-pages-hosting.md).

## Install for offline use
On iPhone: open the Pages URL in Safari, then Share > Add to Home Screen. Open it once online so the service worker caches everything, then test in airplane mode before you travel.

## After changing the app
If you change cached files in a breaking way, bump `CACHE` in `app/sw.js` so phones fetch the new version.
