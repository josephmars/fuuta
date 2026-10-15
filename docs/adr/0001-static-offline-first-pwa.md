# 0001: Static offline-first PWA, no backend

- Status: accepted
- Date: 2026-10-14

## Context
The app is for a trip to Mauritania, where connectivity may be poor. It is a personal tool for one learner, not a multi-user service.

## Decision
Ship a no-build static PWA (vanilla JS) with a service worker. Progress is stored in `localStorage`. No accounts, no server, no CDNs or web fonts.

## Consequences
- Works offline once installed; trivially hosted (GitHub Pages).
- Progress doesn't sync across devices and is lost if site data is cleared.
- Offline install needs HTTPS, so a deploy step is required before the trip.
- A live AI conversation partner is out of scope; role-plays will be scripted.
