"""Histogram duel LUT payouts vs SMOOTH · VH targets (wins + lose-mirror pot).

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/duel_payout_histogram.py
  $PY tools/duel_payout_histogram.py --mode bonus_duel_cat --lut-dir library/publish_files
"""

from __future__ import annotations

import argparse
import csv
import io
import json
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LUT_DIR = ROOT / "library" / "publish_files"
TARGETS_PATH = Path(__file__).resolve().parent / "duel_smooth_vh_targets.json"
COST = 150.0
MODES = ("bonus_duel_cat", "bonus_duel_dog")

DISPLAY_EDGES = [
    0,
    0.1,
    10,
    25,
    40,
    60,
    90,
    120,
    150,
    180,
    220,
    280,
    350,
    450,
    550,
    700,
    1000,
    1500,
    2000,
    2500,
    5000,
    10000,
    25000,
    1e18,
]
DISPLAY_LABELS = [
    "0 lose",
    "0.1–10",
    "10–25",
    "25–40",
    "40–60",
    "60–90",
    "90–120",
    "120–150",
    "150–180",
    "180–220",
    "220–280",
    "280–350",
    "350–450",
    "450–550",
    "550–700",
    "700–1000",
    "1000–1500",
    "1500–2000",
    "2000–2500",
    "2500–5000",
    "5000–10k",
    "10k–25k",
    "25k max",
]


def _load_lut(path: Path) -> list[tuple[int, int, float]]:
    rows: list[tuple[int, int, float]] = []
    with path.open() as f:
        for line in csv.reader(f):
            if not line:
                continue
            sid, w, pay = int(line[0]), int(float(line[1])), int(float(line[2]))
            rows.append((sid, w, pay / 100.0))
    return rows


def _load_books_pots(books_path: Path) -> dict[int, float]:
    """book id → victory pot (bet mult) from duelEnd dog+cat."""
    pots: dict[int, float] = {}
    if not books_path.exists():
        return pots
    if books_path.suffix == ".json":
        data = json.loads(books_path.read_text(encoding="utf-8"))
        books = data if isinstance(data, list) else [data]
        for book in books:
            pots[int(book["id"])] = _pot_from_book(book)
        return pots
    if zstd is None:
        return pots
    dctx = zstd.ZstdDecompressor()
    with books_path.open("rb") as f:
        with dctx.stream_reader(f) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text:
                line = line.strip()
                if not line:
                    continue
                book = json.loads(line)
                pots[int(book["id"])] = _pot_from_book(book)
    return pots


def _pot_from_book(book: dict) -> float:
    for e in book.get("events") or []:
        if isinstance(e, dict) and e.get("type") == "duelEnd":
            return (int(e.get("dogTotal") or 0) + int(e.get("catTotal") or 0)) / 100.0
    return float(book.get("payoutMultiplier") or 0) / 100.0


def _band_index(x: float) -> int:
    if x <= 0:
        return 0
    for i in range(1, len(DISPLAY_EDGES) - 1):
        lo, hi = DISPLAY_EDGES[i], DISPLAY_EDGES[i + 1]
        lab = DISPLAY_LABELS[i]
        if lab == "10k–25k":
            if 10000 <= x < 25000:
                return i
        elif lab == "25k max":
            if x >= 25000:
                return i
        elif lo <= x < hi:
            return i
    return len(DISPLAY_LABELS) - 1


def _vs_target(values_w: list[tuple[float, float]], win_w: float, targets: dict) -> list[dict]:
    """values_w: (weight, amount) for the population (wins or loses)."""
    cmp = []
    if win_w <= 0:
        return cmp
    below_w = sum(w for w, x in values_w if 0 < x < COST)
    for b in targets.get("bands", []):
        lo, hi = float(b["lo"]), float(b["hi"])
        share = float(b["share"])
        if hi <= COST and lo < COST:
            got = below_w / win_w
        elif hi >= 25000:
            got = sum(w for w, x in values_w if x >= lo) / win_w
        else:
            got = sum(w for w, x in values_w if lo <= x < hi) / win_w
        cmp.append(
            {
                "label": b["label"],
                "target": 100.0 * share,
                "got": 100.0 * got,
                "delta_pp": 100.0 * (got - share),
            }
        )
    return cmp


def analyze(
    rows: list[tuple[int, int, float]],
    targets: dict | None,
    pots_by_id: dict[int, float] | None = None,
) -> dict:
    tw = sum(w for _, w, _ in rows) or 1
    win_w = sum(w for _, w, x in rows if x > 0) or 1
    lose_w = sum(w for _, w, x in rows if x <= 0)
    ev_all = sum(w * x for _, w, x in rows) / tw
    ev_win = sum(w * x for _, w, x in rows if x > 0) / win_w
    below_w = sum(w for _, w, x in rows if 0 < x < COST)

    counts = [0.0] * len(DISPLAY_LABELS)
    for _, w, x in rows:
        counts[_band_index(x)] += w

    bands = []
    for i, lab in enumerate(DISPLAY_LABELS):
        w = counts[i]
        bands.append(
            {
                "label": lab,
                "pct_all": 100.0 * w / tw,
                "pct_wins": (100.0 * w / win_w) if i > 0 else None,
            }
        )

    out: dict = {
        "n_rows": len(rows),
        "p_lose": lose_w / tw,
        "p_win": win_w / tw,
        "p_below_150_given_win": below_w / win_w,
        "p_above_150_all": sum(w for _, w, x in rows if x >= COST) / tw,
        "e_all": ev_all,
        "e_win": ev_win,
        "rtp_vs_cost": ev_all / COST,
        "bands": bands,
    }

    if targets:
        out["target_p_below_150_given_win"] = targets.get("p_below_150_given_win")
        out["target_e_win"] = targets.get("e_win")
        win_vals = [(w, x) for _, w, x in rows if x > 0]
        out["vs_target_wins"] = _vs_target(win_vals, win_w, targets)

    # Lose-mirror: pot among pay==0 rows (needs books).
    if pots_by_id and lose_w > 0:
        lose_vals: list[tuple[float, float]] = []
        lose_counts = [0.0] * len(DISPLAY_LABELS)
        below_lose = 0.0
        for sid, w, x in rows:
            if x > 0:
                continue
            pot = float(pots_by_id.get(sid, 0.0))
            lose_vals.append((w, pot))
            lose_counts[_band_index(pot)] += w
            if 0 < pot < COST:
                below_lose += w
        lose_bands = []
        for i, lab in enumerate(DISPLAY_LABELS):
            lw = lose_counts[i]
            lose_bands.append(
                {
                    "label": lab,
                    "pct_loses": 100.0 * lw / lose_w,
                }
            )
        out["lose_victory"] = {
            "p_below_150_given_lose": below_lose / lose_w,
            "e_pot_given_lose": sum(w * p for w, p in lose_vals) / lose_w,
            "bands": lose_bands,
        }
        if targets:
            out["vs_target_loses"] = _vs_target(lose_vals, lose_w, targets)
    return out


def _print_report(mode: str, report: dict) -> None:
    print("=" * 88)
    print(f"{mode}")
    print(
        f"  P(lose)={100*report['p_lose']:.2f}%  P(win)={100*report['p_win']:.2f}%  "
        f"P(<150|win)={100*report['p_below_150_given_win']:.2f}%  "
        f"E[win|win]={report['e_win']:.2f}  RTP≈{report['rtp_vs_cost']:.4f}"
    )
    if report.get("target_p_below_150_given_win") is not None:
        print(
            f"  TARGET P(<150|win)={100*report['target_p_below_150_given_win']:.2f}%  "
            f"TARGET E[win|win]={report['target_e_win']:.1f}"
        )
    print(f"  {'band':12} {'%all':>8} {'%wins':>8}")
    for b in report["bands"]:
        pw = "—" if b["pct_wins"] is None else f"{b['pct_wins']:8.3f}"
        print(f"  {b['label']:12} {b['pct_all']:8.3f} {pw}")
    if report.get("vs_target_wins"):
        print("  vs TARGET (wins / payout):")
        print(f"  {'label':12} {'target':>8} {'got':>8} {'Δpp':>8}")
        for row in report["vs_target_wins"]:
            print(
                f"  {row['label']:12} {row['target']:8.2f} {row['got']:8.2f} {row['delta_pp']:8.2f}"
            )
    lv = report.get("lose_victory")
    if lv:
        print(
            f"  LOSE pot: P(<150|lose)={100*lv['p_below_150_given_lose']:.2f}%  "
            f"E[pot|lose]={lv['e_pot_given_lose']:.2f}"
        )
        print(f"  {'band':12} {'%loses':>8}")
        for b in lv["bands"]:
            if b["pct_loses"] < 0.05 and b["label"] in {"0 lose"}:
                continue
            print(f"  {b['label']:12} {b['pct_loses']:8.3f}")
    if report.get("vs_target_loses"):
        print("  vs TARGET (loses / victory pot):")
        print(f"  {'label':12} {'target':>8} {'got':>8} {'Δpp':>8}")
        for row in report["vs_target_loses"]:
            print(
                f"  {row['label']:12} {row['target']:8.2f} {row['got']:8.2f} {row['delta_pp']:8.2f}"
            )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", choices=[*MODES, "all"], default="all")
    ap.add_argument("--lut-dir", type=Path, default=DEFAULT_LUT_DIR)
    ap.add_argument("--targets", type=Path, default=TARGETS_PATH)
    ap.add_argument("--json-out", type=Path, default=None)
    ap.add_argument(
        "--no-books",
        action="store_true",
        help="Skip lose-pot join (wins only)",
    )
    args = ap.parse_args()

    targets_all = json.loads(args.targets.read_text()) if args.targets.exists() else {}
    modes = MODES if args.mode == "all" else (args.mode,)
    all_reports = {}
    for mode in modes:
        lut = args.lut_dir / f"lookUpTable_{mode}_0.csv"
        if not lut.exists():
            lut = args.lut_dir / f"lookUpTable_{mode}.csv"
        if not lut.exists():
            print(f"MISSING {lut}")
            continue
        rows = _load_lut(lut)
        pots = {}
        if not args.no_books:
            for cand in (
                args.lut_dir / f"books_{mode}.jsonl.zst",
                ROOT / "library" / "books" / f"books_{mode}.json",
            ):
                pots = _load_books_pots(cand)
                if pots:
                    break
        report = analyze(rows, targets_all.get(mode), pots if pots else None)
        all_reports[mode] = report
        _print_report(mode, report)

    if args.json_out:
        args.json_out.write_text(json.dumps(all_reports, indent=2))
        print(f"Wrote {args.json_out}")


if __name__ == "__main__":
    main()
