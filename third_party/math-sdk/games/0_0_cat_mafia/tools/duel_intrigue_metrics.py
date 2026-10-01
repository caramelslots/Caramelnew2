"""Duel intrigue metrics (phase A) on publish / storybook books.

Reports median mid/final gap, P(lead-change), P(early blowout), scenario mix.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/duel_intrigue_metrics.py
  $PY tools/duel_intrigue_metrics.py --path library/publish_files/books_bonus_duel_cat.jsonl.zst
"""

from __future__ import annotations

import argparse
import io
import json
import statistics
import sys
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None

HERE = Path(__file__).resolve().parents[1]
PUBLISH = HERE / "library" / "publish_files"
BOOKS = HERE / "library" / "books"


def _iter_books(path: Path):
    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            yield from data
        elif isinstance(data, dict):
            yield data
        return
    if path.name.endswith(".jsonl.zst"):
        if zstd is None:
            raise SystemExit("zstandard required")
        dctx = zstd.ZstdDecompressor()
        with path.open("rb") as f:
            with dctx.stream_reader(f) as reader:
                text = io.TextIOWrapper(reader, encoding="utf-8")
                for line in text:
                    line = line.strip()
                    if line:
                        yield json.loads(line)
        return
    raise SystemExit(f"Unsupported {path}")


def _path_points(events: list) -> list[tuple[float, float]]:
    """After each bank update: (cat, dog) in bet mult."""
    pts = []
    for e in events:
        if isinstance(e, dict) and e.get("type") == "duelBankUpdate":
            pts.append(
                (
                    int(e.get("catTotal") or 0) / 100.0,
                    int(e.get("dogTotal") or 0) / 100.0,
                )
            )
    return pts


def _gap(cat: float, dog: float) -> float:
    pot = cat + dog
    if pot <= 0:
        return 0.0
    return abs(cat - dog) / pot


def _leader(cat: float, dog: float) -> str | None:
    if cat > dog:
        return "cat"
    if dog > cat:
        return "dog"
    return None


def analyze_book(book: dict) -> dict | None:
    events = book.get("events") or []
    pts = _path_points(events)
    if len(pts) < 2:
        return None
    end = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelEnd"), None)
    start = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelStart"), None)
    scenario = (start or {}).get("intrigueScenario")

    # Approximate spin index: 2 updates per spin pair → use point index.
    # Prefer ~spin 5 and spin 10 using fractions of path length.
    n = len(pts)
    i5 = min(n - 1, max(0, int(round(0.5 * (n - 1)))))
    i4 = min(n - 1, max(0, int(round(0.35 * (n - 1)))))
    mid_gap = _gap(*pts[i5])
    early_gap = _gap(*pts[i4])
    final_gap = _gap(*pts[-1])

    leads = [_leader(c, d) for c, d in pts]
    lead_changes = 0
    prev = None
    for L in leads:
        if L is None:
            continue
        if prev is not None and L != prev:
            lead_changes += 1
        prev = L

    return {
        "id": book.get("id"),
        "scenario": scenario,
        "mid_gap": mid_gap,
        "early_gap": early_gap,
        "final_gap": final_gap,
        "lead_changes": lead_changes,
        "early_blowout": early_gap > 0.5,
        "winner": (end or {}).get("winner"),
        "player_won": (end or {}).get("playerWon"),
    }


def summarize(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0}
    mid = [r["mid_gap"] for r in rows]
    early_bo = sum(1 for r in rows if r["early_blowout"]) / len(rows)
    lead = sum(1 for r in rows if r["lead_changes"] >= 1) / len(rows)
    scen: dict[str, int] = {}
    for r in rows:
        s = r.get("scenario") or "?"
        scen[s] = scen.get(s, 0) + 1
    return {
        "n": len(rows),
        "median_mid_gap": statistics.median(mid),
        "median_final_gap": statistics.median(r["final_gap"] for r in rows),
        "p_lead_change": lead,
        "p_early_blowout": early_bo,
        "scenarios": {k: round(100.0 * v / len(rows), 1) for k, v in sorted(scen.items())},
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--path", default="")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    paths: list[Path] = []
    if args.path:
        paths = [Path(args.path)]
    else:
        for cand in (
            PUBLISH / "books_bonus_duel_cat.jsonl.zst",
            PUBLISH / "books_bonus_duel_dog.jsonl.zst",
            BOOKS / "books_bonus_duel_cat.json",
            BOOKS / "books_bonus_duel_dog.json",
        ):
            if cand.exists():
                paths.append(cand)
    if not paths:
        raise SystemExit("No duel books found")

    for path in paths:
        rows = []
        for i, book in enumerate(_iter_books(path)):
            r = analyze_book(book)
            if r:
                rows.append(r)
            if args.limit and i + 1 >= args.limit:
                break
        s = summarize(rows)
        print(f"=== {path.name} ===")
        print(json.dumps(s, indent=2))
        # Soft targets from plan A.4
        if s.get("n"):
            ok_mid = s["median_mid_gap"] <= 0.30
            ok_lead = s["p_lead_change"] >= 0.35
            ok_bo = s["p_early_blowout"] <= 0.20
            print(
                f"  check: mid_gap<=0.30 {ok_mid}; "
                f"lead_change>=0.35 {ok_lead}; early_bo<=0.20 {ok_bo}"
            )


if __name__ == "__main__":
    main()
