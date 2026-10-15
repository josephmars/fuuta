# Guide: using external dictionaries (e.g. Glosbe)

[Glosbe](https://glosbe.com/) has a community-built Pulaar-English dictionary (language code `fuc`; also `ff` for Fula). Its landing page lists six countries for Pulaar (Guinea, Guinea-Bissau, Senegal, The Gambia, Mali, Mauritania), says translations come "from various sources" and parallel corpora, and shows no per-entry country or dialect.

How to use it here:
- **A lead, not a source of truth.** Use it to find candidate words, then confirm them against a Mauritanian source or a native speaker ([native-speaker-review.md](native-speaker-review.md)).
- **Items from it start as `unverified`** (they don't ship in the app) with a source of region `other`, provenance `web` and the entry URL.
- **If it differs from the Mauritanian course,** keep the Mauritanian form and record Glosbe's under `variants`.
- **Look entries up by hand.** Don't bulk-scrape the site; check its terms and licensing before copying data in bulk.
