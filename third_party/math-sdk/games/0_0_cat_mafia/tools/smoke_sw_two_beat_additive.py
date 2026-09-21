"""Smoke: additive SW payout + Super FS two-beat book order (no multiprocess)."""

from __future__ import annotations

from game_config import GameConfig
from gamestate import GameState
from src.calculations.lines import Lines


def check_additive_unit() -> None:
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.gametype = config.basegame_type
    gs.sticky_sw = {}
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    phase1 = 0.10
    phase2_raw = 0.10
    product = 2
    orig = Lines.get_lines

    def fake_get_lines(board, config, global_multiplier=1):
        return {
            "totalWin": phase2_raw,
            "wins": [
                {
                    "symbol": "H1",
                    "win": phase2_raw,
                    "positions": [{"reel": 0, "row": 0}],
                    "meta": {
                        "multiplier": 1,
                        "winWithoutMult": phase2_raw,
                        "globalMult": 1,
                        "lineMultiplier": 1,
                        "lineIndex": 0,
                    },
                }
            ],
        }

    Lines.get_lines = staticmethod(fake_get_lines)
    try:
        gs.win_manager.update_spinwin(phase1)
        gs.board = [[gs.create_symbol("L1") for _ in range(4)] for _ in range(5)]
        gs._emit_sw_reeval_wins(product, phase1_wins=[], phase1_total=phase1)
        assert round(float(gs.win_data["totalWin"]), 2) == 0.20
        assert round(float(gs.win_manager.spin_win), 2) == 0.30

        gs.win_manager.reset_spin_win()
        gs.win_manager.running_bet_win = 0.0
        gs.win_manager.update_spinwin(phase1)
        gs._emit_duel_sw_reeval_wins(product, phase1_wins=[], phase1_total=phase1)
        assert round(float(gs.win_manager.spin_win), 2) == 0.30
        assert round(float(gs.win_data["totalWin"]), 2) == 0.20
    finally:
        Lines.get_lines = orig
    print("OK unit additive (base + duel)")


def check_super_always_emits_phase2() -> None:
    """Open curtain always re-evals as a full-column wild — Super does not skip phase-2."""
    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.reset_book()
    gs.gametype = config.freegame_type
    gs.fs_profile = "bonus_super"
    gs.sticky_sw = {1: 2, 3: 3}
    gs._pending_sw_product = 2
    gs._pending_sw_expands = []
    gs.win_manager.reset_spin_win()
    gs.win_manager.running_bet_win = 0.0

    phase1 = 0.10
    phase1_wins = [
        {
            "symbol": "H1",
            "win": phase1,
            "positions": [{"reel": 0, "row": 0}, {"reel": 1, "row": 0}],
            "meta": {
                "multiplier": 1,
                "winWithoutMult": phase1,
                "globalMult": 1,
                "lineMultiplier": 1,
                "lineIndex": 0,
            },
        }
    ]
    # Same lines as phase-1 (new curtain reel unused) — still emit phase-2.
    phase2_raw = 0.10
    product = 6
    orig = Lines.get_lines

    def fake_get_lines(board, config, global_multiplier=1):
        return {
            "totalWin": phase2_raw,
            "wins": [
                {
                    "symbol": "H1",
                    "win": phase2_raw,
                    "positions": [{"reel": 0, "row": 0}, {"reel": 1, "row": 0}],
                    "meta": {
                        "multiplier": 1,
                        "winWithoutMult": phase2_raw,
                        "globalMult": 1,
                        "lineMultiplier": 1,
                        "lineIndex": 0,
                    },
                }
            ],
        }

    Lines.get_lines = staticmethod(fake_get_lines)
    try:
        gs.win_manager.update_spinwin(phase1)
        gs.win_data = {"totalWin": phase1, "wins": list(phase1_wins)}
        gs.board = [[gs.create_symbol("L1") for _ in range(4)] for _ in range(5)]
        n_before = len(gs.book.events)
        gs._emit_sw_reeval_wins(product, phase1_wins=phase1_wins, phase1_total=phase1)
        types = [e.get("type") for e in gs.book.events[n_before:]]
        assert "winInfo" in types, types
        assert round(float(gs.win_data["totalWin"]), 2) == 0.60  # 0.10 * 6
        assert round(float(gs.win_manager.spin_win), 2) == 0.70  # 0.10 + 0.60
    finally:
        Lines.get_lines = orig
    print("OK unit super always emits phase-2")


def check_curtain_full_column_extra_lines() -> None:
    """Lying SW is one cell; after expand, other rows of the column are wild too."""
    from game_features import expand_sw_columns, find_super_wilds

    config = GameConfig()
    gs = GameState(config)
    gs.reset_seed(0)
    gs.betmode = "base"
    gs.criteria = "basegame"
    gs.gametype = config.basegame_type

    # Screenshot board: H2×5 on the top row through a lying SW at reel 2 row 0.
    # Payline 7 (J-J-SW) only exists once the whole column is wild.
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
    assert 1 in p2_lines, p2_lines
    assert 7 in p2_lines, p2_lines
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
    both_wins = 0
    expand_no_phase2 = 0
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
                # Empty post-expand board (no 3-oak even with the full-column wild).
                expand_no_phase2 += 1
                continue
            if not wins_before:
                continue
            # Soft/hard wincap may skip phase-2 setWin; spin_win still additive in math.
            if any(e.get("type") == "wincap" for e in seg):
                continue
            both_wins += 1
            p1 = int(seg[wins_before[-1]].get("totalWin") or 0)
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
            # setWin after curtain = phase2 only; setTotalWin delta = phase2
            # (running may already include prior FS spins).
            last_set_win = int(set_wins_after[-1].get("amount") or 0)
            total_after = int(totals_after[-1].get("amount") or 0)
            total_before = int(totals_before[-1].get("amount") or 0) if totals_before else 0
            if last_set_win == p2 and total_after - total_before == p2:
                additive_ok += 1
            else:
                additive_bad.append((p1, p2, last_set_win, total_before, total_after))

    print(
        f"expand_segs={expand_segs} bad_order={bad_order} "
        f"both_wins={both_wins} expand_no_phase2={expand_no_phase2} "
        f"additive_ok={additive_ok} additive_bad={len(additive_bad)}"
    )
    print("sample orders:", samples)
    if additive_bad[:5]:
        print("additive mismatches:", additive_bad[:5])
    if bad_order:
        raise SystemExit(f"FAIL bad_order={bad_order}")
    if expand_segs == 0:
        raise SystemExit("FAIL: no superWildExpand seen — check bonus_super routing")
    if both_wins and additive_bad:
        raise SystemExit(f"FAIL additive mismatches={len(additive_bad)}")
    print("OK live super spins smoke")


def check_base_sw_expand(n: int = 80) -> None:
    """Force sw_expand criteria on base — assert additive setWin when two-beat."""
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
            p1 = int(seg[wins_before[-1]].get("totalWin") or 0)
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
                bad.append((p1, p2, last_set_win, total_before, total_after, types))
    print(f"base sw_expand both_wins={both} additive_ok={ok} bad={len(bad)}")
    if bad[:5]:
        print("base mismatches:", bad[:5])
    if both == 0:
        raise SystemExit("FAIL: no base two-beat wins in sample")
    if bad:
        raise SystemExit(f"FAIL additive mismatches={len(bad)}")
    print("OK base sw_expand additive smoke")


if __name__ == "__main__":
    check_additive_unit()
    check_super_always_emits_phase2()
    check_curtain_full_column_extra_lines()
    check_base_sw_expand()
    check_super_live()
