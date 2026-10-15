# 0003: Only Mauritanian Pulaar is "verified"

- Status: accepted
- Date: 2026-10-14

## Context
Pulaar/Fula varies by country (the Gambian course spells and phrases greetings differently from the Mauritanian one). Mixing them would teach phrases that may not be natural in Mauritania.

## Decision
An item may be `verified` only if one of its sources has region `mauritania`. Material from other regions is stored in `variants` for comparison and never ships. Doubtful transcriptions are `needs-review` with a note, and show a "check spelling" badge. `unverified` items are excluded from the app. The validator enforces this.

## Consequences
- The app contents stay defensible, but coverage is limited to what Mauritanian sources provide.
- A native speaker's confirmation should be added as a `native-speaker` source with region `mauritania`.
