"""Post-pass: make duel books board↔win honest without full re-sim.

For each spin package: spinWin/totalWin := sum(wins[].win) (paytable).
Reorder is left as-is. Bank cumulatives rebuilt; residual to duelEnd via bankPad.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/fix_duel_book_honesty.py
  $PY tools/fix_duel_book_honesty.py --storybook   # also library/books/*.json
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None

from duel_intrigue import (
    _split_duel_timeline,
    _rebuild_events,
    _pad_banks_to_finals,
    _sync_package_line_amounts,
)

ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "library" / "publish_files"
BOOKS = ROOT / "library" / "books"


def _fix_events(events: list) -> bool:
    dict_events = [e for e in events if isinstance(e, dict)]
    if not dict_events:
        return False
    end = next((e for e in dict_events if e.get("type") == "duelEnd"), None)
    if end is None:
        return False
    dog_t = int(end.get("dogTotal") or 0) / 100.0
    cat_t = int(end.get("catTotal") or 0) / 100.0

    prefix, cat_pkgs, dog_pkgs, suffix = _split_duel_timeline(dict_events)
    if not cat_pkgs and not dog_pkgs:
        return False

    for p in cat_pkgs + dog_pkgs:
        _sync_package_line_amounts(p)

    new_events = _rebuild_events(prefix, cat_pkgs, dog_pkgs, suffix)
    _pad_banks_to_finals(new_events, dog_t, cat_t)
    events[:] = new_events
    return True


def _iter_zst(path: Path):
    if zstd is None:
        raise SystemExit("zstandard required")
    dctx = zstd.ZstdDecompressor()
    with path.open("rb") as f:
        with dctx.stream_reader(f) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text:
                if line.strip():
                    yield json.loads(line)


def _write_zst(path: Path, books: list[dict]) -> None:
    cctx = zstd.ZstdCompressor()
    with path.open("wb") as f:
        with cctx.stream_writer(f, closefd=False) as writer:
            buf = io.StringIO()
            for book in books:
                buf.write(json.dumps(book, separators=(",", ":")))
                buf.write("\n")
                if buf.tell() > 1_000_000:
                    writer.write(buf.getvalue().encode("utf-8"))
                    buf = io.StringIO()
            if buf.tell():
                writer.write(buf.getvalue().encode("utf-8"))


def fix_zst(path: Path, limit: int = 0) -> tuple[int, int]:
    books = []
    n = fixed = 0
    for book in _iter_zst(path):
        n += 1
        ev = book.get("events")
        if isinstance(ev, list) and _fix_events(ev):
            fixed += 1
        books.append(book)
        if limit and n >= limit:
            break
    _write_zst(path, books)
    return n, fixed


def fix_json(path: Path) -> tuple[int, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    books = data if isinstance(data, list) else [data]
    fixed = 0
    for book in books:
        ev = book.get("events")
        if isinstance(ev, list) and _fix_events(ev):
            fixed += 1
    path.write_text(json.dumps(books if isinstance(data, list) else books[0], separators=(",", ":")), encoding="utf-8")
    return len(books), fixed


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--storybook", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    targets = [
        PUBLISH / "books_bonus_duel_cat.jsonl.zst",
        PUBLISH / "books_bonus_duel_dog.jsonl.zst",
    ]
    if args.storybook:
        targets += [
            BOOKS / "books_bonus_duel_cat.json",
            BOOKS / "books_bonus_duel_dog.json",
        ]

    for path in targets:
        if not path.exists():
            print(f"skip missing {path}")
            continue
        if path.suffix == ".json":
            n, fixed = fix_json(path)
        else:
            n, fixed = fix_zst(path, limit=args.limit)
        print(f"{path.name}: scanned={n} fixed={fixed}")


if __name__ == "__main__":
    main()
