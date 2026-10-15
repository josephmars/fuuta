"""Record that a native speaker confirmed (or corrected) items.

Usage:
  uv run tools/confirm.py --source SOURCE_ID ITEM_ID [ITEM_ID ...] [--fix ITEM_ID="new pulaar"] [--clear-notes]

SOURCE_ID must be registered in content/sources.json with provenance `native-speaker` and region `mauritania`.
Each item gets the source added; `needs-review` items become `verified`. --fix replaces the Pulaar text
(and also confirms it). Run `uv run tools/validate.py` afterwards.
"""
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(argv: list[str]) -> int:
    source, ids, fixes, clear = None, [], {}, False
    it = iter(argv)
    for a in it:
        if a == "--source":
            source = next(it, None)
        elif a == "--fix":
            k, _, v = (next(it, "") or "").partition("=")
            fixes[k] = unicodedata.normalize("NFC", v)
        elif a == "--clear-notes":
            clear = True
        else:
            ids.append(a)
    ids = list(dict.fromkeys(ids + list(fixes)))
    if not source or not ids:
        print(__doc__)
        return 2
    sources = {s["id"]: s for s in json.loads((ROOT / "content" / "sources.json").read_text(encoding="utf-8"))}
    s = sources.get(source)
    if not s or s["provenance"] != "native-speaker" or s["region"] != "mauritania":
        print(f"error: '{source}' must be in content/sources.json with provenance 'native-speaker' and region 'mauritania'")
        return 1
    remaining, changed = set(ids), 0
    for path in sorted((ROOT / "content" / "units").glob("*.json")):
        unit = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for item in unit["items"]:
            if item["id"] not in remaining:
                continue
            remaining.discard(item["id"])
            if source not in item["sources"]:
                item["sources"].append(source)
            if item["id"] in fixes:
                item["pulaar"] = fixes[item["id"]]
            if item["status"] != "verified":
                item["status"] = "verified"
            if clear:
                item.pop("notes", None)
            dirty, changed = True, changed + 1
        if dirty:
            path.write_text(json.dumps(unit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for missing in sorted(remaining):
        print(f"warning: no item with id '{missing}'")
    print(f"confirmed {changed} item(s) via {source}")
    return 0 if not remaining else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
