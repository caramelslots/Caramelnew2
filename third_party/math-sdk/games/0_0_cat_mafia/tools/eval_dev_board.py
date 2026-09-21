#!/usr/bin/env python3
"""Evaluate a Dev-menu board with the live Cat Mafia math engine.

Reads one JSON object from stdin, writes one JSON object to stdout.

Input:
  {
    "board": [[{"name": "H2"}, ...], ...],   # 5 reels × 4 visible rows
    "mode": "base" | "bonus_normal" | "bonus_super" | "bonus_duel",
    "sticky": [{"reel": 2, "mult": 4}],
    "expand": [{"reel": 2, "row": 0, "mult": 4}]
  }

Output: { "events": [...book events...], "payoutMultiplier": int, "lines": {...} }
"""

from __future__ import annotations

import json
import sys
from typing import Any

from game_config import GameConfig
from game_features import product_of_mults, stamp_expanded_sw_column
from gamestate import GameState


MODE_SETUP = {
    "base": {
        "betmode": "base",
        "criteria": "sw_expand",
        "gametype": "basegame",
        "fs_profile": None,
    },
    "BASE": {
        "betmode": "base",
        "criteria": "sw_expand",
        "gametype": "basegame",
        "fs_profile": None,
    },
    "bonus_normal": {
        "betmode": "bonus_normal",
        "criteria": "freegame",
        "gametype": "freegame",
        "fs_profile": "bonus_normal",
    },
    "bonus_super": {
        "betmode": "bonus_super",
        "criteria": "freegame",
        "gametype": "freegame",
        "fs_profile": "bonus_super",
    },
    "bonus_duel": {
        "betmode": "bonus_duel_cat",
        "criteria": "freegame",
        "gametype": "freegame",
        "fs_profile": "bonus_normal",
    },
}


def _cell_name(cell: Any) -> str:
    if isinstance(cell, dict):
        return str(cell.get("name") or "L2")
    return str(cell)


def _cell_mult(cell: Any) -> int | None:
    if not isinstance(cell, dict):
        return None
    raw = cell.get("multiplier")
    if raw is None:
        return None
    return max(1, int(raw))


def _line_indices(event: dict) -> list[int]:
    idxs = []
    for w in event.get("wins") or []:
        meta = w.get("meta") or {}
        try:
            idxs.append(int(meta.get("lineIndex")))
        except (TypeError, ValueError):
            pass
    return sorted(idxs)


def _phase_lines(events: list[dict]) -> tuple[list[int], list[int]]:
    phase1: list[int] = []
    phase2: list[int] = []
    seen_expand = False
    for e in events:
        if e.get("type") == "superWildExpand":
            seen_expand = True
            continue
        if e.get("type") != "winInfo":
            continue
        idxs = _line_indices(e)
        if seen_expand:
            phase2 = idxs
        else:
            phase1 = idxs
    return phase1, phase2


def eval_dev_board(payload: dict) -> dict:
    mode_key = str(payload.get("mode") or "base")
    setup = MODE_SETUP.get(mode_key) or MODE_SETUP["base"]

    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.betmode = setup["betmode"]
    gs.criteria = setup["criteria"]
    gs.gametype = (
        config.freegame_type if setup["gametype"] == "freegame" else config.basegame_type
    )
    gs.fs_profile = setup["fs_profile"]
    gs.global_multiplier = 1
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0
    gs.sticky_sw = {}
    gs._pending_sw_expands = []
    gs._pending_sw_product = 1
    gs.top_symbols = [gs.create_symbol("L2") for _ in range(config.num_reels)]
    gs.bottom_symbols = [gs.create_symbol("L2") for _ in range(config.num_reels)]

    raw_board = payload.get("board") or []
    if len(raw_board) != config.num_reels:
        raise ValueError(f"board must have {config.num_reels} reels, got {len(raw_board)}")

    board = []
    for reel, col in enumerate(raw_board):
        rows = []
        n_rows = int(config.num_rows[reel])
        for row in range(n_rows):
            cell = col[row] if row < len(col) else "L2"
            name = _cell_name(cell)
            sym = gs.create_symbol(name)
            mult = _cell_mult(cell)
            if name == "SW" and mult is not None:
                sym.assign_attribute({"multiplier": max(2, int(mult))})
            rows.append(sym)
        board.append(rows)
    gs.board = board

    sticky = list(payload.get("sticky") or [])
    for s in sticky:
        reel = int(s["reel"])
        mult = max(2, int(s.get("mult") or 2))
        gs.sticky_sw[reel] = mult
        stamp_expanded_sw_column(gs.board, gs.create_symbol, reel, mult, row=0)

    expand_spec = list(payload.get("expand") or [])
    for e in expand_spec:
        reel, row = int(e["reel"]), int(e["row"])
        mult = max(2, int(e.get("mult") or 2))
        gs.board[reel][row] = gs.create_symbol("SW")
        gs.board[reel][row].assign_attribute({"multiplier": mult})

    if gs.gametype == config.freegame_type or gs.is_duel_betmode():
        gs.apply_fs_sw_board_rules()
    else:
        if gs.sticky_sw:
            gs._pending_sw_product = product_of_mults(gs.sticky_sw.values())
            gs._pending_sw_expands = gs._sticky_expands_payload()
        gs._sync_sw_padding()

    gs._capture_and_cloak_lying_sw_mults()
    for e in expand_spec:
        key = (int(e["reel"]), int(e["row"]))
        if key in gs._lying_sw_mult_by_pos:
            gs._lying_sw_mult_by_pos[key] = max(2, int(e.get("mult") or 2))

    gs.evaluate_lines_board(emit=True)
    if gs.gametype == config.freegame_type or gs.is_duel_betmode():
        gs.resolve_fs_spin_features()
    else:
        gs.resolve_base_spin_features()

    gs.win_manager.update_gametype_wins(gs.gametype)
    gs.evaluate_finalwin()

    events = list(gs.book.events)
    phase1, phase2 = _phase_lines(events)
    payout = int(round(float(gs.win_manager.running_bet_win) * 100, 0))
    return {
        "events": events,
        "payoutMultiplier": payout,
        "lines": {
            "phase1": phase1,
            "phase2": phase2,
        },
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        result = eval_dev_board(payload)
        json.dump(result, sys.stdout, default=str)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:  # noqa: BLE001
        json.dump({"error": str(exc)}, sys.stderr)
        sys.stderr.write("\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
