"""Patch force_record JSON with criteria groups from segmented lookup tables.

Run after sims if books were generated before imprint_wins recorded criteria
for 0_cluster fences. Safe to re-run (replaces existing criteria entries).
"""

from __future__ import annotations

import json
import os
from collections import defaultdict

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIBRARY = os.path.join(HERE, "library")
CRITERIA_TO_PATCH = ("0_cluster",)


def patch_mode(mode: str) -> None:
    seg_path = os.path.join(LIBRARY, "lookup_tables", f"lookUpTableSegmented_{mode}.csv")
    force_path = os.path.join(LIBRARY, "forces", f"force_record_{mode}.json")

    by_criteria: dict[str, list[int]] = defaultdict(list)
    with open(seg_path, encoding="UTF-8") as f:
        for line in f:
            book_id, criteria, _bg, _fg = line.strip().split(",", 3)
            if criteria in CRITERIA_TO_PATCH:
                by_criteria[criteria].append(int(book_id))

    with open(force_path, encoding="UTF-8") as f:
        records: list[dict] = json.load(f)

    records = [
        r
        for r in records
        if not any(s.get("name") == "criteria" for s in r.get("search", []))
    ]

    for criteria, book_ids in sorted(by_criteria.items()):
        records.append(
            {
                "search": [{"name": "criteria", "value": criteria}],
                "timesTriggered": len(book_ids),
                "bookIds": book_ids,
            }
        )

    with open(force_path, "w", encoding="UTF-8") as f:
        json.dump(records, f, indent=4)

    print(f"{mode}: patched criteria groups -> { {k: len(v) for k, v in by_criteria.items()} }")


def main() -> None:
    for mode in ("base", "bonus_boost"):
        patch_mode(mode)


if __name__ == "__main__":
    main()
