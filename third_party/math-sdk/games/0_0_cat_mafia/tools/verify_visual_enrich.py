"""Verify visual enrich: high density up, line/paw/SW outcomes unchanged."""

from __future__ import annotations

import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SDK = ROOT.parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SDK))

from gamestate import GameState
from game_config import GameConfig
from game_visual_enrich import (
    HIGH_SYMBOLS,
    LOW_SYMBOLS,
    TARGET_HIGH_SHARE,
    _outcome_fingerprint,
    enrich_board_non_winning,
)


def _lh_share(board) -> float:
    low = high = 0
    for col in board:
        for cell in col:
            name = cell.name
            if name in LOW_SYMBOLS:
                low += 1
            elif name in HIGH_SYMBOLS:
                high += 1
    lh = low + high
    return (high / lh) if lh else 0.0


def main() -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.betmode = "base"
    rng = random.Random(20260730)

    before_shares = []
    after_shares = []
    applied_total = 0
    invariant_fails = 0
    samples = 400
    criteria_cycle = ["0", "0_cluster", "basegame", "paw", "sw_expand"]

    for i in range(samples):
        gs.reset_seed(i)
        gs.criteria = criteria_cycle[i % len(criteria_cycle)]
        gs.reset_book()
        gs.gametype = config.basegame_type

        orig = gs.enrich_visual_non_winning_symbols
        gs.enrich_visual_non_winning_symbols = lambda: None  # type: ignore
        try:
            gs.draw_board(emit_event=False)
        finally:
            gs.enrich_visual_non_winning_symbols = orig

        before_shares.append(_lh_share(gs.board))
        gmult = getattr(gs, "global_multiplier", 1) or 1
        raw = gs.symbol_storage.create_symbol
        fp0 = _outcome_fingerprint(gs.board, raw, config, gmult)
        applied = enrich_board_non_winning(
            gs.board,
            config,
            gs.create_symbol,
            create_symbol_raw=raw,
            global_multiplier=gmult,
            rng=random.Random(rng.randint(0, 10**9)),
        )
        applied_total += applied
        fp1 = _outcome_fingerprint(gs.board, raw, config, gmult)
        if fp0 != fp1:
            invariant_fails += 1
        after_shares.append(_lh_share(gs.board))

    avg_before = sum(before_shares) / len(before_shares)
    avg_after = sum(after_shares) / len(after_shares)
    print(f"samples={samples}")
    print(
        f"avg H share among L+H before={avg_before:.3f} "
        f"after={avg_after:.3f} target={TARGET_HIGH_SHARE}"
    )
    print(f"total L→H applied={applied_total} (avg {applied_total / samples:.2f}/board)")
    print(f"invariant failures={invariant_fails}")
    if invariant_fails:
        raise SystemExit(1)
    if avg_after < 0.40:
        raise SystemExit(f"after share too low: {avg_after:.3f}")
    if avg_after + 0.02 < avg_before:
        raise SystemExit("high share did not increase")
    print("ok")


if __name__ == "__main__":
    main()
