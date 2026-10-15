# Guide: running and deploying

## Run locally
```
uv run tools/build.py
uv run python -m http.server -d app 8000
```
Open http://localhost:8000. Rebuild after any content change.

## Try it on your phone
Serve on your network (`-b 0.0.0.0`) and open `http://<your-mac-ip>:8000` from the same Wi-Fi. Service workers and "install" need HTTPS, so this only tests the UI.

## Install for offline use
Deploy the `app/` folder (with a freshly built `data.json`) to an HTTPS host such as GitHub Pages. On iPhone: open the site in Safari, then Share > Add to Home Screen. Open it once online so the service worker caches everything, then test in airplane mode before you travel.

## After changing the app
If you change cached files in a breaking way, bump `CACHE` in `app/sw.js` so phones fetch the new version.
