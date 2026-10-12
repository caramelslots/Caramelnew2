#!/usr/bin/env python3
"""Assert: after targetShootRound, extra-FS reveals never show BT / bulletCollect."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK_DIRS = [
    ROOT / "library" / "books",
    ROOT / "library" / "publish_files",
]


def check_book(book: dict, label: str) -> list[str]:
    errors: list[str] = []
    events = book.get("events") or book.get("state") or []
    shoot_seen = False
    for ev in events:
        if not isinstance(ev, dict):
            continue
        et = ev.get("type")
        if et == "targetShootRound":
            shoot_seen = True
            continue
        if not shoot_seen:
            continue
        if et == "bulletCollect":
            errors.append(f"{label}: bulletCollect after shoot")
        if et == "reveal":
            board = ev.get("board") or []
            for col in board:
                for cell in col:
                    if isinstance(cell, dict) and cell.get("name") == "BT":
                        errors.append(f"{label}: BT on reveal after shoot")
                        return errors
    return errors


def main() -> int:
    paths: list[Path] = []
    for d in BOOK_DIRS:
        if d.is_dir():
            paths.extend(sorted(d.glob("books_*.json")))
    if not paths:
        print("No books_*.json found — run sims / run_storybook first", file=sys.stderr)
        return 2

    errors: list[str] = []
    checked = 0
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        books = data if isinstance(data, list) else data.get("books", [])
        for book in books:
            bid = book.get("id", "?")
            errs = check_book(book, f"{path.name}#{bid}")
            if errs:
                errors.extend(errs)
            # Count only books that actually shoot
            if any(e.get("type") == "targetShootRound" for e in (book.get("events") or [])):
                checked += 1

    if errors:
        print(f"FAIL: {len(errors)} issue(s) across {checked} shoot books")
        for e in errors[:40]:
            print(" ", e)
        return 1

    print(f"OK: {checked} shoot books — no BT / bulletCollect after targetShootRound")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
