"""Analyze reelstrip symbol distribution and predict natural hit rates.

Usage:
    cd third_party/math-sdk/games/0_0_daloniil_test
    python3 tools/analyze_reels.py

Outputs:
- Per-reel symbol counts (для каждого reelstrip).
- Predicted natural HR для top outcomes (5-of-a-kind).
- Сравнение с target HRs из M4_REELSTRIP_TUNING.md.
"""

from __future__ import annotations

import csv
from pathlib import Path
from collections import Counter

REELS_DIR = Path(__file__).resolve().parent.parent / "reels"
RESULT_DIR = Path(__file__).resolve().parent.parent / "tools" / "out"

# Cash Stacks layout
NUM_REELS = 5
WINDOW = 5  # rows visible per reel
PAYLINES = 30
# Average payline coverage factor: of 30 lines, how many cover any given (row, col)
# pair on average. Empirically for 30-line patterns on 5x5 ~ 6 lines per cell.
PAYLINE_OVERLAP = 6.0 / WINDOW  # ~1.2

# Target HRs (см. M4_REELSTRIP_TUNING.md)
TARGETS = {
    "5xW_base": 10_000,
    "5xW_fs": 10_000,
    "5xH1_base": 1_000,
    "5xH2_base": 1_500,
    "5xH3_base": 2_000,
    "5xH4_base": 2_500,
    "5xL1_base": 80,
    "5xL2_base": 80,
    "5xL3_base": 80,
    "5xL4_base": 80,
}

# Wild substitutes for non-W non-B non-M
WILDS = {"W"}
NON_WILD_TARGETS = {"H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"}


def load_reel(path: Path) -> list[list[str]]:
    """Load reelstrip CSV: each row is one position, columns = 5 reels."""
    rows: list[list[str]] = []
    with path.open() as f:
        reader = csv.reader(f)
        for row in reader:
            row = [c.strip() for c in row if c.strip()]
            if not row or row[0] in ("R0", "R1", "R2", "R3", "R4"):
                continue
            rows.append(row)
    return rows


def count_per_reel(reel_data: list[list[str]]) -> list[Counter]:
    """Transpose: column index → Counter of symbols."""
    if not reel_data:
        return []
    n_cols = len(reel_data[0])
    counts: list[Counter] = [Counter() for _ in range(n_cols)]
    for row in reel_data:
        for i, sym in enumerate(row):
            if i < n_cols:
                counts[i][sym] += 1
    return counts


def predict_5kind_hr(
    counts: list[Counter],
    reel_len: int,
    target_symbol: str,
    include_wild_sub: bool = True,
) -> float:
    """Predicted HR for 5-of-a-kind target symbol on any payline.

    Formula:
        P(specific row across 5 reels) = product((K_i + (W_i if W subs)) / N)
        P(any of 30 paylines) ≈ P * 30 * overlap_factor (rough; overestimates).
        HR = 1 / P_any
    """
    p_per_payline = 1.0
    for c in counts:
        k = c.get(target_symbol, 0)
        if include_wild_sub and target_symbol not in {"W", "B", "M"}:
            k += c.get("W", 0)
        p_per_payline *= k / reel_len

    if p_per_payline == 0:
        return float("inf")

    p_any = min(1.0, p_per_payline * PAYLINES * PAYLINE_OVERLAP)
    return 1.0 / p_any if p_any > 0 else float("inf")


def predict_bonus_trigger_hr(counts: list[Counter], reel_len: int) -> float:
    """P(3+ scatter on 5 reels with 5-row window).

    P(scatter visible on reel i) = 1 - C(N - K - WIN + 1, WIN) / C(N, WIN)
    Упростим: P_i ≈ 1 - (1 - K_i/N)^5 (per-row independence; чуть завышает).
    """
    p_visible: list[float] = []
    for c in counts:
        k = c.get("B", 0)
        if k == 0:
            p_visible.append(0.0)
            continue
        # P(any of 5 visible cells is B) ≈ 1 - (1 - k/N)^5
        p = 1 - (1 - k / reel_len) ** WINDOW
        p_visible.append(min(p, 1.0))

    # Probability of >=3 scatters across 5 reels (independent per-reel)
    n = len(p_visible)
    from itertools import product
    p_3plus = 0.0
    for combo in product([0, 1], repeat=n):
        if sum(combo) < 3:
            continue
        prob = 1.0
        for i, bit in enumerate(combo):
            prob *= p_visible[i] if bit else (1 - p_visible[i])
        p_3plus += prob

    return float("inf") if p_3plus == 0 else 1.0 / p_3plus


def analyze_reel_file(path: Path) -> dict:
    """Full analysis of one reelstrip file."""
    data = load_reel(path)
    reel_len = len(data)
    counts = count_per_reel(data)
    n_reels = len(counts)

    result = {
        "name": path.stem,
        "reel_len": reel_len,
        "n_reels": n_reels,
        "counts": [dict(c) for c in counts],
        "predicted_hr": {},
    }

    for sym in ["W", "H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]:
        hr = predict_5kind_hr(counts, reel_len, sym, include_wild_sub=True)
        result["predicted_hr"][f"5x{sym}"] = hr

    result["predicted_hr"]["fs_trigger"] = predict_bonus_trigger_hr(counts, reel_len)

    return result


def format_count_row(counts: list[Counter], symbols: list[str]) -> str:
    """Format symbol counts as table row."""
    cells = []
    for sym in symbols:
        per_reel = [c.get(sym, 0) for c in counts]
        if len(set(per_reel)) == 1:
            cells.append(f"{per_reel[0]:>3}")
        else:
            mn, mx = min(per_reel), max(per_reel)
            cells.append(f"{mn}-{mx}".rjust(3))
    return " ".join(cells)


def main():
    files = sorted(REELS_DIR.glob("*.csv"))
    all_results = []

    print("=" * 80)
    print("REELSTRIP COUNTS PER REEL (R0 R1 R2 R3 R4)")
    print("=" * 80)
    symbols = ["W", "B", "M", "H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]
    header = "Reelstrip (len) | " + " | ".join(f"{s:>2}" for s in symbols)
    print(header)
    print("-" * len(header))

    for path in files:
        r = analyze_reel_file(path)
        all_results.append(r)

        line = f"{r['name']} ({r['reel_len']:>3})    | "
        cells = []
        for sym in symbols:
            per_reel = [c.get(sym, 0) for c in r["counts"]]
            mn, mx = min(per_reel), max(per_reel)
            if mn == mx:
                cells.append(f"{mn:>2}")
            else:
                cells.append(f"{mn}-{mx}".rjust(4))
        line += " | ".join(c.rjust(2) for c in cells)
        print(line)

    print()
    print("=" * 80)
    print("PREDICTED NATURAL HRS (5-of-a-kind, with W substitution)")
    print("=" * 80)
    print(f"{'Reelstrip':<10} | " + " | ".join(
        f"{k:>10}" for k in ["5xW", "5xH1", "5xH2", "5xH3", "5xH4",
                              "5xL1", "5xL2", "5xL3", "5xL4", "fs_trig"]))
    print("-" * 120)
    for r in all_results:
        cells = []
        for sym in ["W", "H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]:
            hr = r["predicted_hr"].get(f"5x{sym}", float("inf"))
            cells.append(f"{int(hr):>10,}" if hr != float("inf") else f"{'inf':>10}")
        hr_fs = r["predicted_hr"]["fs_trigger"]
        cells.append(f"{int(hr_fs):>10,}" if hr_fs != float("inf") else f"{'inf':>10}")
        print(f"{r['name']:<10} | " + " | ".join(cells))

    print()
    print("=" * 80)
    print("TARGET HRs (M4)")
    print("=" * 80)
    for k, v in TARGETS.items():
        print(f"  {k:<15}: 1 in {v:,}")

    print()
    print("=" * 80)
    print("ASSESSMENT: BR0 (base) vs targets")
    print("=" * 80)
    br0 = next(r for r in all_results if r["name"] == "BR0")
    issues = []
    for sym, target_key in [
        ("W", "5xW_base"), ("H1", "5xH1_base"), ("H2", "5xH2_base"),
        ("H3", "5xH3_base"), ("H4", "5xH4_base"),
        ("L1", "5xL1_base"), ("L2", "5xL2_base"),
        ("L3", "5xL3_base"), ("L4", "5xL4_base"),
    ]:
        pred = br0["predicted_hr"][f"5x{sym}"]
        target = TARGETS[target_key]
        if pred == float("inf"):
            ratio = float("inf")
        else:
            ratio = pred / target
        status = ""
        if ratio > 3.0:
            status = "TOO RARE (target much more common)"
        elif ratio < 0.33:
            status = "TOO COMMON (target much rarer)"
        else:
            status = "in ballpark"
        print(f"  5x{sym:<3}: predicted HR {int(pred):>10,} vs target {target:>6,} (ratio {ratio:.2f}) — {status}")
        if status.startswith("TOO"):
            issues.append((sym, pred, target, ratio))

    # FS trigger
    pred_fs = br0["predicted_hr"]["fs_trigger"]
    print(f"  FS  : predicted natural HR {int(pred_fs):>10,} (target ~200 with 10% forced quota)")

    if issues:
        print()
        print("Suggested adjustments (BR0):")
        for sym, pred, target, ratio in issues:
            avg_count = sum(c.get(sym, 0) for c in br0["counts"]) / len(br0["counts"])
            mult = ratio ** (1 / 5)  # if 5-of-a-kind, scale each reel by this
            new_count = avg_count * mult
            print(f"  - {sym}: avg per reel {avg_count:.1f} → suggested {new_count:.1f}")


if __name__ == "__main__":
    main()
