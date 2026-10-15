# Guide: brand assets

The hat logo is drawn as vectors in `tools/make_brand.py` and exported to `design/` and `app/icons/`.

| Asset | Where | Used for |
|---|---|---|
| `design/icon-app.svg` -> `icon-192/512.png`, `apple-touch-icon.png` | `app/icons/` | Home Screen icon: brown hat on olive, with the FUUTA wordmark and no small text |
| `design/icon-maskable.svg` -> `icon-maskable-192/512.png` | `app/icons/` | Android adaptive icon (art kept inside the safe zone) |
| `design/icon-site.svg`, `design/favicon.svg` -> `favicon.svg`, `favicon-32.png` | `app/icons/` | Browser tab icon: hat only |
| `design/logo.svg` | README and Learn screen | Hat + FUUTA + "Learn Mauritanian Pulaar" on cream |
| `design/icon-collection-mock.png` | `design/` | The original mock the hat idea came from (reference only) |

## Regenerating
```
uv run tools/make_brand.py
```
Needs macOS (Georgia Bold and Helvetica Bold are converted to paths so the SVGs need no fonts) and Google Chrome for rasterising (set `CHROME` to use another path). Colours come from the app palette: olive `#6a7f44`, cream `#f3ece0`, gold `#d3a53b`.

## After changing an icon
- Bump `CACHE` in `app/sw.js` so phones fetch the new files.
- iOS caches Home Screen icons: delete the app from the Home Screen and add it again to see the new one.
