"""Smoke: per-line sticky × + phase-2 gate (new curtain must hit a line)."""

from __future__ import annotations

from game_config import GameConfig
from game_features import (
    apply_sticky_mults_to_wins,
    expand_sw_columns,
    find_super_wilds,
    sticky_mult_for_positions,
    wins_hit_any_reel,
)
from gamestate import GameState
from src.calculations.lines import Lines


def check_per_line_helpers() -> None:
    sticky = {2: 4, 4: 4}
    assert sticky_mult_for_positions([{"reel": 0}, {"reel": 1}, {"reel": 2}], sticky) == 4
    assert sticky_mult_for_positions([{"reel": 0}, {"reel": 2}, {"reel": 4}], sticky) == 16
    assert sticky_mult_for_positions([{"reel": 0}, {"reel": 1}], sticky) == 1
    wins = [{"positions": [{"reel": 0}, {"reel": 2}], "win": 0.1, "meta": {}}]
    assert wins_hit_any_reel(wins, {2})
    assert not wins_hit_any_reel(wins, {4})
    data = {
        "totalWin": 0.2,
        "wins": [
            {"positions": [{"reel": 0}, {"reel": 2}], "win": 0.1, "meta": {}},
            {"positions": [{"reel": 0}, {"reel": 1}], "win": 0.1, "meta": {}},
        ],
    }
    apply_sticky_mults_to_wins(data, sticky)
    assert round(float(data["wins"][0]["win"]), 2) == 0.4
    assert round(float(data["wins"][1]["win"]), 2) == 0.1
    assert round(float(data["totalWin"]), 2) == 0.5
    print("OK per-line helpers")


def check_additive_unit_hit_new_reel() -> None:
    """Phase-2 emits when fake wins include the new curtain reel."""
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.gametype = config.basegame_type
    gs.sticky_sw = {2: 2}
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    phase1 = 0.10
    orig = Lines.get_lines

    def fake_get_lines(board, config, global_multiplier=1):
        return {
            "totalWin": 0.10,
            "wins": [
                {
                    "symbol": "H1",
                    "win": 0.10,
                    "positions": [
                        {"reel": 0, "row": 0},
                        {"reel": 1, "row": 0},
                        {"reel": 2, "row": 0},
                    ],
                    "meta": {
                        "multiplier": 1,
                        "winWithoutMult": 0.10,
                        "globalMult": 1,
                        "lineMultiplier": 1,
                        "lineIndex": 1,
                    },
                }
            ],
        }

    Lines.get_lines = staticmethod(fake_get_lines)
    try:
        gs.win_manager.update_spinwin(phase1)
        gs.board = [[gs.create_symbol("L1") for _ in range(4)] for _ in range(5)]
        gs._emit_sw_reeval_wins(phase1_wins=[], phase1_total=phase1, new_reels={2})
        # raw 0.10 × sticky ×2 on reel 2 = 0.20 phase2; spin = 0.10 + 0.20
        assert round(float(gs.win_data["totalWin"]), 2) == 0.20
        assert round(float(gs.win_manager.spin_win), 2) == 0.30
    finally:
        Lines.get_lines = orig
    print("OK unit additive when new reel hit")


def check_super_skips_phase2_when_new_unused() -> None:
    """New curtain reel unused by all wins → no phase-2 winInfo; spin stays phase1."""
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.gametype = config.freegame_type
    gs.fs_profile = "bonus_super"
    gs.sticky_sw = {2: 4, 4: 4}
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    phase1 = 0.80
    orig = Lines.get_lines

    def fake_get_lines(board, config, global_multiplier=1):
        # Same A-lines: only through reel 2, not reel 4.
        return {
            "totalWin": 0.20,
            "wins": [
                {
                    "symbol": "L1",
                    "win": 0.10,
                    "positions": [
                        {"reel": 0, "row": 3},
                        {"reel": 1, "row": 3},
                        {"reel": 2, "row": 3},
                    ],
                    "meta": {"lineIndex": 4, "winWithoutMult": 0.10},
                },
                {
                    "symbol": "L1",
                    "win": 0.10,
                    "positions": [
                        {"reel": 0, "row": 3},
                        {"reel": 1, "row": 3},
                        {"reel": 2, "row": 2},
                    ],
                    "meta": {"lineIndex": 16, "winWithoutMult": 0.10},
                },
            ],
        }

    Lines.get_lines = staticmethod(fake_get_lines)
    try:
        gs.win_manager.update_spinwin(phase1)
        gs.board = [[gs.create_symbol("L1") for _ in range(4)] for _ in range(5)]
        n_before = len(gs.book.events)
        gs._emit_sw_reeval_wins(phase1_total=phase1, new_reels={4})
        types = [e.get("type") for e in gs.book.events[n_before:]]
        assert "winInfo" not in types, types
        assert round(float(gs.win_manager.spin_win), 2) == 0.80
    finally:
        Lines.get_lines = orig
    print("OK unit super skips phase-2 when new curtain unused")


def check_screenshot_board_no_phase2() -> None:
    """Live board: sticky ×4 reel2, lying SW reel4, A–A bottom — no phase-2."""
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.betmode = "bonus_super"
    gs.criteria = "freegame"
    gs.gametype = config.freegame_type
    gs.fs_profile = "bonus_super"
    gs.sticky_sw = {2: 4}
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    # Bottom row (3): L1 L1 SW H3 SW — line 4 stops at reel 2 (H3 breaks).
    # Also line 16 [3,3,2,1,1]: L1 L1 SW(row2) …
    names = [
        ["L4", "H3", "H4", "L1"],
        ["H4", "H1", "L2", "L1"],
        ["SW", "SW", "SW", "SW"],
        ["H3", "L4", "H3", "H3"],
        ["SW", "L2", "L2", "L2"],
    ]
    gs.board = [
        [gs.create_symbol(names[reel][row]) for row in range(4)] for reel in range(5)
    ]
    for r in range(4):
        gs.board[2][r].assign_attribute({"multiplier": 4})
    gs.board[4][0].assign_attribute({"multiplier": 4})
    gs._capture_and_cloak_lying_sw_mults()

    gs.evaluate_lines_board(emit=True)
    p1 = float(gs.win_data.get("totalWin") or 0)
    assert abs(p1 - 0.8) < 1e-6, p1  # 0.1×4 + 0.1×4

    phase1_total = p1
    new_hits = gs._collect_new_lying_sw_hits()
    assert new_hits, "expected lying SW on reel 4"
    expands_new, _ = expand_sw_columns(gs.board, gs.create_symbol, new_hits)
    new_reels = {int(e["reel"]) for e in expands_new}
    for e in expands_new:
        gs.sticky_sw[int(e["reel"])] = int(e["mult"])
    n_before = len(gs.book.events)
    gs._emit_sw_reeval_wins(phase1_total=phase1_total, new_reels=new_reels)
    types = [e.get("type") for e in gs.book.events[n_before:]]
    assert "winInfo" not in types, types
    assert abs(float(gs.win_manager.spin_win) - 0.8) < 1e-6
    print("OK screenshot board: phase1=0.8, no phase-2")


def check_hit_reel5_emits_phase2() -> None:
    """Same frame but L1 on reel3 bottom → 5oak through reel4 after expand → phase-2."""
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.betmode = "bonus_super"
    gs.criteria = "freegame"
    gs.gametype = config.freegame_type
    gs.fs_profile = "bonus_super"
    gs.sticky_sw = {2: 4}
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    names = [
        ["L4", "H3", "H4", "L1"],
        ["H4", "H1", "L2", "L1"],
        ["SW", "SW", "SW", "SW"],
        ["H3", "L4", "H3", "L1"],  # continues A to reel 3
        ["SW", "L2", "L2", "L2"],
    ]
    gs.board = [
        [gs.create_symbol(names[reel][row]) for row in range(4)] for reel in range(5)
    ]
    for r in range(4):
        gs.board[2][r].assign_attribute({"multiplier": 4})
    gs.board[4][0].assign_attribute({"multiplier": 4})
    gs._capture_and_cloak_lying_sw_mults()

    gs.evaluate_lines_board(emit=True)
    phase1_total = float(gs.win_data.get("totalWin") or 0)
    # Phase-1: line 4 is L1×4 through sticky (lying reel4 cloaked wild) = 0.5×? 
    # 4oak L1 = 0.5, × sticky 4 = 2.0 — plus maybe line 16
    assert phase1_total > 0

    new_hits = gs._collect_new_lying_sw_hits()
    expands_new, _ = expand_sw_columns(gs.board, gs.create_symbol, new_hits)
    new_reels = {int(e["reel"]) for e in expands_new}
    for e in expands_new:
        gs.sticky_sw[int(e["reel"])] = int(e["mult"])
    n_before = len(gs.book.events)
    gs._emit_sw_reeval_wins(phase1_total=phase1_total, new_reels=new_reels)
    types = [e.get("type") for e in gs.book.events[n_before:]]
    assert "winInfo" in types, types
    # Line through both curtains: ×4×4 on that line; not global ×16 on everything.
    for w in gs.win_data.get("wins") or []:
        reels = {int(p["reel"]) for p in w.get("positions") or []}
        sticky_m = int((w.get("meta") or {}).get("stickyMult") or 1)
        if 4 in reels and 2 in reels:
            assert sticky_m == 16, (reels, sticky_m, w)
        elif 2 in reels and 4 not in reels:
            assert sticky_m == 4, (reels, sticky_m, w)
    print("OK hit reel5 emits phase-2 with per-line sticky")


def check_curtain_full_column_extra_lines() -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.betmode = "base"
    gs.criteria = "basegame"
    gs.gametype = config.basegame_type

    names = [
        ["H2", "L1", "L3", "L4"],
        ["H2", "L2", "L4", "L1"],
        ["SW", "L2", "L3", "L4"],
        ["H2", "L4", "L1", "L3"],
        ["H2", "L4", "L2", "B"],
    ]
    gs.board = [
        [gs.create_symbol(names[reel][row]) for row in range(4)] for reel in range(5)
    ]

    saved = gs._neutralize_board_sw_mults()
    try:
        phase1 = Lines.get_lines(gs.board, config)
    finally:
        gs._restore_board_sw_mults(saved)
    p1_lines = {int(w["meta"]["lineIndex"]) for w in phase1["wins"]}
    assert 1 in p1_lines, p1_lines
    assert 7 not in p1_lines, p1_lines

    expand_sw_columns(gs.board, gs.create_symbol, find_super_wilds(gs.board))
    assert all(cell.name == "SW" for cell in gs.board[2])

    saved = gs._neutralize_board_sw_mults()
    try:
        phase2 = Lines.get_lines(gs.board, config)
    finally:
        gs._restore_board_sw_mults(saved)
    p2_lines = {int(w["meta"]["lineIndex"]) for w in phase2["wins"]}
    assert 1 in p2_lines and 7 in p2_lines, p2_lines
    print("OK curtain full-column extra lines (payline 7 after expand)")


def segment_spins(events: list[dict]) -> list[list[dict]]:
    segs: list[list[dict]] = []
    i = 0
    while i < len(events):
        if events[i].get("type") != "reveal":
            i += 1
            continue
        j = i + 1
        seg = [events[i]]
        while j < len(events) and events[j].get("type") != "reveal":
            t = events[j].get("type")
            if t in (
                "freeSpinTargetPick",
                "targetShoot",
                "enterFreeSpin",
                "freeSpinTrigger",
                "finalWin",
            ):
                break
            seg.append(events[j])
            j += 1
        segs.append(seg)
        i = j if j > i else i + 1
    return segs


def check_super_live(n: int = 200) -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.betmode = "bonus_super"
    gs.criteria = "freegame"

    expand_segs = 0
    bad_order = 0
    gated_ok = 0
    both_wins = 0
    additive_ok = 0
    additive_bad: list[tuple] = []
    samples: list[list[str]] = []

    for sim in range(n):
        gs.run_spin(sim)
        for seg in segment_spins(list(gs.book.events)):
            types = [e.get("type") for e in seg]
            if "superWildExpand" not in types:
                continue
            exp_i = types.index("superWildExpand")
            if types[0] != "reveal" or exp_i < 1:
                bad_order += 1
                if len(samples) < 6:
                    samples.append(types)
                continue
            expand_segs += 1
            if len(samples) < 6:
                samples.append(types)
            wins_before = [k for k, t in enumerate(types) if t == "winInfo" and k < exp_i]
            wins_after = [k for k, t in enumerate(types) if t == "winInfo" and k > exp_i]
            if not wins_after:
                gated_ok += 1
                continue
            if not wins_before:
                continue
            if any(e.get("type") == "wincap" for e in seg):
                continue
            both_wins += 1
            p2 = int(seg[wins_after[0]].get("totalWin") or 0)
            set_wins_after = [
                e for k, e in enumerate(seg) if e.get("type") == "setWin" and k > exp_i
            ]
            totals_before = [
                e for k, e in enumerate(seg) if e.get("type") == "setTotalWin" and k < exp_i
            ]
            totals_after = [
                e for k, e in enumerate(seg) if e.get("type") == "setTotalWin" and k > exp_i
            ]
            if not set_wins_after or not totals_after:
                continue
            last_set_win = int(set_wins_after[-1].get("amount") or 0)
            total_after = int(totals_after[-1].get("amount") or 0)
            total_before = int(totals_before[-1].get("amount") or 0) if totals_before else 0
            if last_set_win == p2 and total_after - total_before == p2:
                additive_ok += 1
            else:
                additive_bad.append((p2, last_set_win, total_before, total_after))

    print(
        f"expand_segs={expand_segs} bad_order={bad_order} gated_no_p2={gated_ok} "
        f"both_wins={both_wins} additive_ok={additive_ok} additive_bad={len(additive_bad)}"
    )
    print("sample orders:", samples)
    if bad_order:
        raise SystemExit(f"FAIL bad_order={bad_order}")
    if expand_segs == 0:
        raise SystemExit("FAIL: no superWildExpand seen — check bonus_super routing")
    if both_wins and additive_bad:
        raise SystemExit(f"FAIL additive mismatches={len(additive_bad)}")
    print("OK live super spins smoke")


def check_base_sw_expand(n: int = 80) -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.betmode = "base"
    gs.criteria = "sw_expand"

    both = 0
    ok = 0
    bad: list[tuple] = []
    for sim in range(n):
        gs.run_spin(sim)
        for seg in segment_spins(list(gs.book.events)):
            types = [e.get("type") for e in seg]
            if "superWildExpand" not in types:
                continue
            exp_i = types.index("superWildExpand")
            wins_before = [k for k, t in enumerate(types) if t == "winInfo" and k < exp_i]
            wins_after = [k for k, t in enumerate(types) if t == "winInfo" and k > exp_i]
            if not (wins_before and wins_after):
                continue
            both += 1
            p2 = int(seg[wins_after[0]].get("totalWin") or 0)
            set_wins_after = [
                e for k, e in enumerate(seg) if e.get("type") == "setWin" and k > exp_i
            ]
            totals_before = [
                e for k, e in enumerate(seg) if e.get("type") == "setTotalWin" and k < exp_i
            ]
            totals_after = [
                e for k, e in enumerate(seg) if e.get("type") == "setTotalWin" and k > exp_i
            ]
            if not set_wins_after or not totals_after:
                continue
            last_set_win = int(set_wins_after[-1].get("amount") or 0)
            total_after = int(totals_after[-1].get("amount") or 0)
            total_before = int(totals_before[-1].get("amount") or 0) if totals_before else 0
            if last_set_win == p2 and total_after - total_before == p2:
                ok += 1
            else:
                bad.append((p2, last_set_win, total_before, total_after, types))
    print(f"base sw_expand both_wins={both} additive_ok={ok} bad={len(bad)}")
    if both == 0:
        raise SystemExit("FAIL: no base two-beat wins in sample")
    if bad:
        raise SystemExit(f"FAIL additive mismatches={len(bad)}")
    print("OK base sw_expand additive smoke")


if __name__ == "__main__":
    check_per_line_helpers()
    check_additive_unit_hit_new_reel()
    check_super_skips_phase2_when_new_unused()
    check_screenshot_board_no_phase2()
    check_hit_reel5_emits_phase2()
    check_curtain_full_column_extra_lines()
    check_base_sw_expand()
    check_super_live()
