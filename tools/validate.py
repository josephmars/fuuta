"""Validate content: schema, unique ids, source references, and the verification rule.

Rule: an item may only be `verified` if at least one of its sources is from Mauritania.
Material from other regions (Gambia, Senegal, Guinea...) is cross-check only.
"""
import json
import sys
import unicodedata
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []
warnings: list[str] = []


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON: {e}")


def check_schema(data, schema_path: Path, label: str):
    validator = Draft202012Validator(json.loads(schema_path.read_text()))
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in err.path) or "(root)"
        errors.append(f"{label}: {loc}: {err.message}")


def main() -> int:
    sources = load(ROOT / "content" / "sources.json") or []
    check_schema(sources, ROOT / "schema" / "sources.schema.json", "sources.json")
    region = {s["id"]: s["region"] for s in sources if isinstance(s, dict) and "id" in s}
    if len(region) != len(sources):
        errors.append("sources.json: duplicate or missing source ids")

    seen_ids: dict[str, str] = {}
    counts = {"verified": 0, "needs-review": 0, "unverified": 0}
    for path in sorted((ROOT / "content" / "units").glob("*.json")):
        label = path.name
        unit = load(path)
        if unit is None:
            continue
        check_schema(unit, ROOT / "schema" / "unit.schema.json", label)
        for item in unit.get("items", []) if isinstance(unit, dict) else []:
            iid = item.get("id", "?")
            if iid in seen_ids:
                errors.append(f"{label}: duplicate id '{iid}' (also in {seen_ids[iid]})")
            seen_ids[iid] = label
            for field in ("pulaar", "english"):
                v = item.get(field, "")
                if v != unicodedata.normalize("NFC", v):
                    errors.append(f"{label}: {iid}: {field} is not NFC-normalized")
            refs = item.get("sources", []) + [v.get("source") for v in item.get("variants", [])]
            for ref in refs:
                if ref not in region:
                    errors.append(f"{label}: {iid}: unknown source '{ref}'")
            status = item.get("status")
            if status in counts:
                counts[status] += 1
            if status == "verified" and not any(region.get(s) == "mauritania" for s in item.get("sources", [])):
                errors.append(f"{label}: {iid}: 'verified' requires a Mauritanian source")
            if status == "needs-review" and not item.get("notes"):
                warnings.append(f"{label}: {iid}: needs-review without a note explaining why")

    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    total = sum(counts.values())
    print(f"{total} items: {counts['verified']} verified, {counts['needs-review']} needs-review, "
          f"{counts['unverified']} unverified; {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
