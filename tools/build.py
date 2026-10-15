"""Build app/data.json from content/. Runs validation first and stops on errors.

Usage: uv run tools/build.py
`unverified` items are left out of the app; variants (other regions) never ship.
"""
import json
import sys
from pathlib import Path

from validate import main as validate

ROOT = Path(__file__).resolve().parent.parent
KEEP = ("id", "pulaar", "english", "french", "hassaniya", "kind", "tags", "status", "notes")


def main() -> int:
    if validate():
        print("build aborted: fix validation errors first")
        return 1
    units = []
    for path in sorted((ROOT / "content" / "units").glob("*.json")):
        unit = json.loads(path.read_text(encoding="utf-8"))
        items = [{k: it[k] for k in KEEP if k in it} for it in unit["items"] if it["status"] != "unverified"]
        units.append({"id": unit["id"], "title": unit["title"], "order": unit["order"],
                      "description": unit.get("description", ""), "items": items})
    units.sort(key=lambda u: u["order"])
    out = ROOT / "app" / "data.json"
    out.write_text(json.dumps({"units": units}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}: {sum(len(u['items']) for u in units)} items in {len(units)} units")
    return 0


if __name__ == "__main__":
    sys.exit(main())
