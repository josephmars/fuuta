"""Build app/data.json from content/. Runs validation first and stops on errors.

Usage: uv run tools/build.py
`unverified` items are left out of the app; variants (other regions) never ship.
"""
import json
import sys
from pathlib import Path

from validate import main as validate

ROOT = Path(__file__).resolve().parent.parent
KEEP = ("id", "pulaar", "english", "french", "hassaniya", "kind", "tags", "status", "usage", "notes")


def main() -> int:
    if validate():
        print("build aborted: fix validation errors first")
        return 1
    sources = {x["id"]: x for x in json.loads((ROOT / "content" / "sources.json").read_text(encoding="utf-8"))}
    confirmed = lambda it: any(sources[r]["provenance"] == "native-speaker" and sources[r]["region"] == "mauritania" for r in it["sources"])
    units = []
    for path in sorted((ROOT / "content" / "units").glob("*.json")):
        unit = json.loads(path.read_text(encoding="utf-8"))
        items = [{**{k: it[k] for k in KEEP if k in it}, **({"confirmed": True} if confirmed(it) else {})}
                 for it in unit["items"] if it["status"] != "unverified"]
        units.append({"id": unit["id"], "title": unit["title"], "order": unit["order"],
                      "description": unit.get("description", ""), "items": items})
    units.sort(key=lambda u: u["order"])
    by_id = {it["id"]: it for u in units for it in u["items"]}
    dialogues = []
    for path in sorted((ROOT / "content" / "dialogues").glob("*.json")):
        dlg = json.loads(path.read_text(encoding="utf-8"))
        line = lambda i: {"id": i, "pulaar": by_id[i]["pulaar"], "english": by_id[i]["english"]}
        dialogues.append({"id": dlg["id"], "title": dlg["title"], "order": dlg["order"], "description": dlg.get("description", ""),
                          "turns": [{"speaker": t["speaker"], **line(t["item"]),
                                     **({"distractors": [line(d) for d in t["distractors"]]} if t.get("distractors") else {})}
                                    for t in dlg["turns"]]})
    dialogues.sort(key=lambda d: d["order"])
    alphabet = json.loads((ROOT / "content" / "alphabet.json").read_text(encoding="utf-8"))
    out = ROOT / "app" / "data.json"
    out.write_text(json.dumps({"units": units, "dialogues": dialogues, "alphabet": {k: alphabet[k] for k in ("title", "description", "letters")}}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}: {sum(len(u['items']) for u in units)} items in {len(units)} units")
    return 0


if __name__ == "__main__":
    sys.exit(main())
