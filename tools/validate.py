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

    alphabet_path = ROOT / "content" / "alphabet.json"
    if alphabet_path.exists():
        alphabet = load(alphabet_path)
        if alphabet is not None:
            check_schema(alphabet, ROOT / "schema" / "alphabet.schema.json", "alphabet.json")
            for ref in alphabet.get("sources", []) if isinstance(alphabet, dict) else []:
                if ref not in region:
                    errors.append(f"alphabet.json: unknown source '{ref}'")
            if isinstance(alphabet, dict) and not any(region.get(r) == "mauritania" for r in alphabet.get("sources", [])):
                errors.append("alphabet.json: needs a Mauritanian source")
            for l in alphabet.get("letters", []) if isinstance(alphabet, dict) else []:
                if bool(l.get("like")) == bool(l.get("noEquivalent")):
                    errors.append(f"alphabet.json: letter '{l.get('letter')}' needs exactly one of 'like' or 'noEquivalent'")

    seen_ids: dict[str, str] = {}
    status_of: dict[str, str] = {}
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
            status_of[iid] = item.get("status", "")
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

    for path in sorted((ROOT / "content" / "dialogues").glob("*.json")):
        label = f"dialogues/{path.name}"
        dlg = load(path)
        if dlg is None:
            continue
        check_schema(dlg, ROOT / "schema" / "dialogue.schema.json", label)
        for n, turn in enumerate(dlg.get("turns", []) if isinstance(dlg, dict) else []):
            for ref in [turn.get("item")] + turn.get("distractors", []):
                if ref not in status_of:
                    errors.append(f"{label}: turn {n + 1}: unknown item '{ref}'")
                elif ref == turn.get("item") and status_of[ref] != "verified":
                    errors.append(f"{label}: turn {n + 1}: '{ref}' is not verified; dialogues use verified lines only")
            if turn.get("speaker") == "you" and len(turn.get("distractors", [])) < 2:
                errors.append(f"{label}: turn {n + 1}: 'you' turns need at least 2 distractors")
            if turn.get("speaker") == "them" and turn.get("distractors"):
                errors.append(f"{label}: turn {n + 1}: 'them' turns must not have distractors")
            if turn.get("item") in turn.get("distractors", []):
                errors.append(f"{label}: turn {n + 1}: the answer is also listed as a distractor")

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
