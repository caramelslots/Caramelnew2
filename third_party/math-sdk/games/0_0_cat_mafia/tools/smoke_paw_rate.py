"""Sample base books by bet-mode quotas and report paw / SW rates.

`criteria=basegame` alone is misleading: that fence rejects dead spins, and paw
always pays — so dense P looks like 50%+ hit rate. This script mirrors sim
quotas (dead / basegame / freegame).
"""

from __future__ import annotations

import random
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT.parent.parent)]

from game_config import GameConfig  # noqa: E402
from gamestate import GameState  # noqa: E402


def _quota_allocation(config: GameConfig, mode: str, n: int) -> list[str]:
    betmode = next(b for b in config.bet_modes if b.get_name() == mode)
    dists = betmode.get_distributions()
    criteria = [d._criteria for d in dists]
    weights = [d._quota for d in dists]
    rng = random.Random(0)
    return rng.choices(criteria, weights=weights, k=n)


def main(n: int = 5000) -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.betmode = "base"
    allocation = _quota_allocation(config, "base", n)

    counts: Counter[str] = Counter()
    by_crit: Counter[str] = Counter()
    paw_by_crit: Counter[str] = Counter()
    payouts: list[float] = []

    for i, criteria in enumerate(allocation):
        gs.criteria = criteria
        gs.run_spin(i)
        types = {e.get("type") for e in gs.book.events if isinstance(e, dict)}
        by_crit[criteria] += 1
        if "pawCoinResolve" in types:
            counts["paw"] += 1
            paw_by_crit[criteria] += 1
        if "superWildExpand" in types:
            counts["sw"] += 1
            if criteria == "sw_expand":
                counts["sw_fence"] += 1
        if "pawCoinResolve" in types and "superWildExpand" in types:
            counts["xor_both"] += 1
        if "freeSpinTrigger" in types or "freeSpinTargetPick" in types:
            counts["fs"] += 1
        win = float(getattr(gs, "final_win", 0) or 0)
        payouts.append(win)
        if win > 0:
            counts["hit"] += 1

    payouts_sorted = sorted(payouts)

    def pct(q: float) -> float:
        if not payouts_sorted:
            return 0.0
        return payouts_sorted[int((len(payouts_sorted) - 1) * q)]

    print(f"n={n} mode=base (quota mix)")
    print(f"  paw={counts['paw']} ({100 * counts['paw'] / n:.2f}%)  ~1/{n / max(counts['paw'], 1):.0f}")
    print(f"  sw_expand={counts['sw']} ({100 * counts['sw'] / n:.2f}%)  ~1/{n / max(counts['sw'], 1):.0f}")
    print(f"  xor_both={counts['xor_both']}")
    print(f"  fs={counts['fs']} ({100 * counts['fs'] / n:.2f}%)")
    print(f"  hit={counts['hit']} ({100 * counts['hit'] / n:.1f}%)")
    print(
        f"  p50={pct(0.5):.2f} p90={pct(0.9):.2f} p99={pct(0.99):.2f} "
        f"max={max(payouts) if payouts else 0:.2f} avg={sum(payouts) / n:.3f}"
    )
    print("  paw by criteria:")
    for crit, total in by_crit.most_common():
        p = paw_by_crit[crit]
        print(f"    {crit}: {p}/{total} ({100 * p / max(total, 1):.1f}%)")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    main(n)
