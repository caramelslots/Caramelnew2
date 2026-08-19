"""Assert Duel book invariants (no B/paw/BT, no ties, playerSide payout rule)."""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None


FORBIDDEN = {"B", "BT", "PB", "PS", "PG"}
HERE = Path(__file__).resolve().parents[1]
PUBLISH = HERE / "library" / "publish_files"
BOOKS = HERE / "library" / "books"


def _iter_books(path: Path):
    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for b in data:
                yield b
        elif isinstance(data, dict):
            yield data
        return
    if path.name.endswith(".jsonl.zst"):
        if zstd is None:
            raise SystemExit("zstandard required for .jsonl.zst")
        dctx = zstd.ZstdDecompressor()
        with path.open("rb") as f:
            with dctx.stream_reader(f) as reader:
                text = io.TextIOWrapper(reader, encoding="utf-8")
                for line in text:
                    line = line.strip()
                    if line:
                        yield json.loads(line)
        return
    raise SystemExit(f"Unsupported book path: {path}")


def _board_names(board) -> set[str]:
    names = set()
    for reel in board or []:
        for cell in reel:
            if isinstance(cell, dict):
                n = cell.get("name")
                if n:
                    names.add(n)
            elif hasattr(cell, "name"):
                names.add(cell.name)
    return names


def check_book(book: dict) -> list[str]:
    errors = []
    events = book.get("events") or []
    types = [e.get("type") for e in events if isinstance(e, dict)]
    if "duelStart" not in types:
        errors.append("missing duelStart")
    if "duelEnd" not in types:
        errors.append("missing duelEnd")

    start = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelStart"), None)
    player_side = (start or {}).get("playerSide") or "cat"
    if player_side not in {"cat", "dog"}:
        errors.append(f"bad playerSide {player_side!r}")

    for e in events:
        if not isinstance(e, dict):
            continue
        if e.get("type") == "duelSpin":
            bad = _board_names(e.get("board")) & FORBIDDEN
            if bad:
                errors.append(f"forbidden symbols on duelSpin: {bad}")
        if e.get("type") in {"pawCoinResolve", "bulletCollect", "freeSpinTrigger", "freeSpinTargetPick"}:
            errors.append(f"forbidden event {e.get('type')}")

    end = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelEnd"), None)
    if end:
        dog = end.get("dogTotal", 0)
        cat = end.get("catTotal", 0)
        if dog == cat:
            errors.append("tie dogTotal == catTotal")
        winner = end.get("winner")
        payout = end.get("payout", 0)
        end_player = end.get("playerSide") or player_side
        player_won = end.get("playerWon")
        if player_won is None:
            player_won = winner == end_player
        expected = (dog + cat) if player_won else 0
        if int(payout) != int(expected):
            errors.append(
                f"payout {payout} != expected {expected} "
                f"(playerSide={end_player}, winner={winner}, playerWon={player_won})"
            )
        if bool(player_won) != (winner == end_player):
            errors.append(f"playerWon {player_won} inconsistent with winner={winner} player={end_player}")
        # RGS: LUT / event payouts are multiplier×100 in steps of 10.
        if int(payout) % 10 != 0:
            errors.append(f"payout {payout} not multiple of 10 (RGS step)")

    pm = book.get("payoutMultiplier")
    if end is not None and pm is not None:
        if int(pm) != int(end.get("payout", 0)):
            errors.append(f"payoutMultiplier {pm} != duelEnd.payout {end.get('payout')}")
    return errors


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--path",
        default="",
        help="books_bonus_duel_cat/dog .json or .jsonl.zst",
    )
    ap.add_argument("--limit", type=int, default=0, help="Max books to scan (0=all)")
    args = ap.parse_args()

    paths: list[Path] = []
    if args.path:
        paths = [Path(args.path)]
    else:
        for candidate in (
            PUBLISH / "books_bonus_duel_cat.jsonl.zst",
            PUBLISH / "books_bonus_duel_dog.jsonl.zst",
            BOOKS / "books_bonus_duel_cat.json",
            BOOKS / "books_bonus_duel_dog.json",
            # legacy single-mode path
            PUBLISH / "books_bonus_duel.jsonl.zst",
            BOOKS / "books_bonus_duel.json",
        ):
            if candidate.exists():
                paths.append(candidate)
    if not paths:
        raise SystemExit(
            "No bonus_duel books found — run run_bonus_duel.py / run_storybook.py first"
        )

    n = 0
    bad = 0
    for path in paths:
        print(f"=== {path} ===")
        for book in _iter_books(path):
            n += 1
            errs = check_book(book)
            if errs:
                bad += 1
                print(f"book {book.get('id', n)}: {errs}")
            if args.limit and n >= args.limit:
                break

    print(f"scanned {n} books, failures {bad}")
    if bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
