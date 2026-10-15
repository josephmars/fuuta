"""List items that need a native speaker's check, as a Markdown checklist to send them.

Usage: uv run tools/review.py [--all]
  default: only `needs-review` items; --all: every item, grouped by unit.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    everything = "--all" in sys.argv
    print("# Pulaar check (Mauritania)\n\nPlease mark each line OK, or write the correct spelling/meaning.\n")
    n = 0
    for path in sorted((ROOT / "content" / "units").glob("*.json")):
        unit = json.loads(path.read_text(encoding="utf-8"))
        rows = [i for i in unit["items"] if everything or i["status"] == "needs-review"]
        if not rows:
            continue
        print(f"## {unit['title']}\n")
        for it in rows:
            note = f"  \n  _Question: {it['notes']}_" if it["status"] == "needs-review" and it.get("notes") else ""
            print(f"- [ ] `{it['id']}` **{it['pulaar']}** = {it['english']}{note}")
            n += 1
        print()
    print(f"({n} items)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
