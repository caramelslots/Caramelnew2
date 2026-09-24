"""Phase A — mathematical duel intrigue (S1–S4 path reshape).

Finals (winner, dogTotal, catTotal, payout) stay frozen.

Honesty rule (board ↔ win):
  We never rewrite spinWin on top of an unrelated board.
  1) If lose-mirror / fence changed finals, uniformly scale each side's spin
     packages (spinWin, wins[].win, phase1, bank delta) so amounts stay tied
     to the same symbols.
  2) Reorder whole spin packages per side to approximate the scenario curve.
  3) Rebuild bank cumulatives from the reordered (scaled) package amounts.

Board symbols and line wins always travel together with their spinWin.
"""

from __future__ import annotations

import copy
import os
import random
from typing import Any

SCENARIO_WEIGHTS = {
    "S1": 0.45,  # Close fight
    "S2": 0.25,  # False lead (loser ahead mid)
    "S3": 0.20,  # Late steal / finish drama
    "S4": 0.10,  # Blowout (rare)
}

# Events that belong to one side-spin package (start → bank update inclusive).
_SPIN_START = "duelSpin"
_SPIN_END = "duelBankUpdate"
_SIDE_EVENT_TYPES = {
    "duelSpin",
    "superWildExpand",
    "duelSpinWin",
    "duelBankUpdate",
}


def intrigue_enabled() -> bool:
    return os.environ.get("DUEL_INTRIGUE", "1") != "0"


def choose_scenario(rng: random.Random) -> str:
    keys = list(SCENARIO_WEIGHTS.keys())
    weights = [SCENARIO_WEIGHTS[k] for k in keys]
    return rng.choices(keys, weights=weights, k=1)[0]


def _q(value: float) -> float:
    return round(float(value), 1)


def _cum_from_progress(total: float, progress: list[float]) -> list[float]:
    """progress[i] in [0,1] after spin i (1-indexed list length n)."""
    out = []
    for p in progress:
        out.append(_q(total * max(0.0, min(1.0, p))))
    if out:
        out[-1] = _q(total)
    return out


def _progress_curves(n: int, scenario: str, rng: random.Random) -> tuple[list[float], list[float]]:
    """Return (winner_progress, loser_progress) length n, each ending at 1."""
    if n <= 0:
        return [], []
    if n == 1:
        return [1.0], [1.0]

    xs = [(i + 1) / n for i in range(n)]

    if scenario == "S4":
        w = []
        l = []
        for i, x in enumerate(xs):
            if i < max(1, n // 3):
                w.append(min(0.85, 0.35 + 0.5 * x + rng.uniform(-0.02, 0.02)))
            else:
                w.append(min(1.0, 0.75 + 0.25 * x))
            l.append(min(0.95, 0.15 * x + 0.05 * rng.random()))
        w[-1] = 1.0
        l[-1] = 1.0
        return _mono(w), _mono(l)

    if scenario == "S2":
        w, l = [], []
        mid = max(2, (2 * n) // 3)
        for i, x in enumerate(xs):
            if i < mid:
                l.append(min(0.9, 0.2 + 0.9 * x + rng.uniform(-0.03, 0.03)))
                w.append(min(0.7, 0.05 + 0.55 * x + rng.uniform(-0.03, 0.03)))
            else:
                t = (i - mid + 1) / max(1, n - mid)
                w.append(min(1.0, 0.55 + 0.45 * t))
                l.append(min(1.0, 0.75 + 0.25 * t))
        w[-1] = 1.0
        l[-1] = 1.0
        return _mono(w), _mono(l)

    if scenario == "S3":
        w, l = [], []
        late = max(1, n - 2)
        for i, x in enumerate(xs):
            if i < late:
                w.append(min(0.72, 0.15 + 0.65 * x + rng.uniform(-0.02, 0.02)))
                l.append(min(0.70, 0.12 + 0.60 * x + rng.uniform(-0.02, 0.02)))
            else:
                w.append(1.0 if i == n - 1 else 0.82 + 0.05 * rng.random())
                l.append(1.0 if i == n - 1 else 0.78 + 0.05 * rng.random())
        w[-1] = 1.0
        l[-1] = 1.0
        return _mono(w), _mono(l)

    # S1 Close fight
    w, l = [], []
    for i, x in enumerate(xs):
        jitter = rng.uniform(-0.04, 0.04)
        base = 0.08 + 0.85 * x
        w.append(min(0.92, base + jitter))
        l.append(min(0.92, base - jitter * 0.7))
    w[-1] = 1.0
    l[-1] = 1.0
    if n >= 2:
        w[-2] = min(w[-2], 0.88)
        l[-2] = min(l[-2], 0.88)
    return _mono(w), _mono(l)


def _mono(vals: list[float]) -> list[float]:
    out = []
    prev = 0.0
    for v in vals:
        v = max(prev, min(1.0, float(v)))
        out.append(v)
        prev = v
    if out:
        out[-1] = 1.0
    return out


def _diffs(cum: list[float]) -> list[float]:
    wins = []
    prev = 0.0
    for c in cum:
        wins.append(_q(max(0.0, c - prev)))
        prev = c
    if wins:
        drift = _q(cum[-1] - sum(wins))
        wins[-1] = _q(max(0.0, wins[-1] + drift))
    return wins


def reshape_spin_wins(
    cat_wins: list[float],
    dog_wins: list[float],
    winner: str,
    scenario: str,
    rng: random.Random,
) -> tuple[list[float], list[float]]:
    """Ideal per-spin targets for intrigue; finals frozen (same totals)."""
    n = max(len(cat_wins), len(dog_wins))
    if n <= 0:
        return [], []

    def pad(xs: list[float]) -> list[float]:
        out = list(xs) + [0.0] * (n - len(xs))
        return out[:n]

    cat_t = _q(sum(pad(cat_wins)))
    dog_t = _q(sum(pad(dog_wins)))
    if winner == "cat":
        w_t, l_t = cat_t, dog_t
    else:
        w_t, l_t = dog_t, cat_t

    pot = _q(w_t + l_t)
    if pot <= 0 or n == 1:
        return pad(cat_wins), pad(dog_wins)

    if scenario == "S4":
        close_until = max(1, n // 3)
    elif scenario == "S3":
        close_until = max(1, n - 2)
    else:
        close_until = max(1, n - 2)

    if scenario == "S4":
        loser_close_frac = 0.35 + 0.1 * rng.random()
        winner_close_frac = 0.55 + 0.15 * rng.random()
    elif scenario == "S2":
        loser_close_frac = 0.75 + 0.15 * rng.random()
        winner_close_frac = 0.35 + 0.15 * rng.random()
    elif scenario == "S3":
        loser_close_frac = 0.70 + 0.15 * rng.random()
        winner_close_frac = 0.55 + 0.15 * rng.random()
    else:
        loser_close_frac = 0.80 + 0.12 * rng.random()
        winner_close_frac = 0.45 + 0.15 * rng.random()

    loser_close = _q(min(l_t, l_t * loser_close_frac))
    if scenario == "S2":
        winner_close = _q(
            min(w_t * winner_close_frac, max(0.1, loser_close * (0.75 + 0.1 * rng.random())))
        )
    elif scenario == "S4":
        winner_close = _q(
            min(w_t * winner_close_frac, max(loser_close * 1.5, loser_close + max(1.0, 0.08 * pot)))
        )
    else:
        target_lead = 0.1 + 0.05 * rng.random() * max(1.0, pot * 0.02)
        winner_close = _q(min(w_t * 0.85, loser_close + target_lead))
        if winner_close < loser_close * 0.85:
            winner_close = _q(min(w_t * 0.85, loser_close * (0.95 + 0.1 * rng.random())))

    winner_close = _q(min(winner_close, _q(w_t - 0.1) if w_t > 0.1 else w_t))
    loser_close = _q(min(loser_close, l_t))

    w_cum: list[float] = []
    l_cum: list[float] = []
    for i in range(n):
        t = (i + 1) / close_until if i < close_until else 1.0
        t = min(1.0, t)
        ease = t * t * (3 - 2 * t)
        if i < close_until:
            jitter = 1.0 + rng.uniform(-0.04, 0.04)
            wc = _q(winner_close * ease * jitter)
            lc = _q(loser_close * ease / max(0.85, jitter))
            if scenario == "S2" and lc <= wc:
                lc = _q(min(l_t, wc + max(0.2, 0.02 * pot)))
            elif scenario not in {"S2", "S4"} and abs(wc - lc) / max(0.1, wc + lc) > 0.22:
                avg = _q(0.5 * (wc + lc))
                if scenario == "S1":
                    wc, lc = _q(avg + 0.1), _q(max(0.0, avg - 0.1))
            w_cum.append(min(wc, winner_close))
            l_cum.append(min(lc, loser_close))
        else:
            rem_i = i - close_until + 1
            rem_n = n - close_until
            u = rem_i / rem_n
            w_cum.append(_q(winner_close + (w_t - winner_close) * u))
            l_cum.append(_q(loser_close + (l_t - loser_close) * u))

    w_cum = _repair_cum(w_cum, w_t)
    l_cum = _repair_cum(l_cum, l_t)

    if winner == "cat":
        cat_cum, dog_cum = w_cum, l_cum
    else:
        dog_cum, cat_cum = w_cum, l_cum

    return _fix_sum(_diffs(cat_cum), cat_t), _fix_sum(_diffs(dog_cum), dog_t)


def _repair_cum(cum: list[float], total: float) -> list[float]:
    out = []
    prev = 0.0
    for i, c in enumerate(cum):
        c = _q(max(prev, c))
        if i == len(cum) - 1:
            c = _q(total)
        out.append(c)
        prev = c
    return out


def _fix_sum(wins: list[float], total: float) -> list[float]:
    if not wins:
        return wins
    total = _q(total)
    wins = [max(0.0, float(w)) for w in wins]
    s = sum(wins)
    if s <= 1e-9:
        wins = [0.0] * len(wins)
        wins[-1] = total
        return [_q(w) for w in wins]
    if abs(s - total) > 0.15:
        scale = total / s
        wins = [_q(w * scale) for w in wins]
    drift = _q(total - sum(wins))
    wins[-1] = _q(max(0.0, wins[-1] + drift))
    drift2 = _q(total - sum(wins))
    if drift2 != 0:
        wins[-1] = _q(wins[-1] + drift2)
    return wins


def extract_spin_wins(events: list[dict]) -> tuple[list[float], list[float]]:
    """Collect per-spin wins from duelBankUpdate order (authoritative bank path)."""
    cat: list[float] = []
    dog: list[float] = []
    for e in events:
        if not isinstance(e, dict) or e.get("type") != "duelBankUpdate":
            continue
        sw = int(e.get("spinWin") or 0) / 100.0
        side = e.get("side")
        if side == "cat":
            cat.append(_q(sw))
        elif side == "dog":
            dog.append(_q(sw))
    return cat, dog


def _scale_cents(value: Any, factor: float) -> int:
    return int(round(float(value or 0) * factor))


def _scale_win_rows(rows: list | None, factor: float) -> list | None:
    if not rows:
        return rows
    out = []
    for row in rows:
        if not isinstance(row, dict):
            out.append(row)
            continue
        r = copy.deepcopy(row)
        if "win" in r:
            r["win"] = _scale_cents(r["win"], factor)
        out.append(r)
    return out


def _scale_package(pkg: list[dict], factor: float) -> None:
    """Uniformly scale all money fields in a spin package (keeps board↔win ratio)."""
    if abs(factor - 1.0) < 1e-12:
        return
    for e in pkg:
        t = e.get("type")
        if t in {"duelSpin", "duelSpinWin", "duelBankUpdate"}:
            if "spinWin" in e:
                e["spinWin"] = _scale_cents(e["spinWin"], factor)
            if "totalWin" in e:
                e["totalWin"] = _scale_cents(e["totalWin"], factor)
            if "phase1TotalWin" in e:
                e["phase1TotalWin"] = _scale_cents(e["phase1TotalWin"], factor)
            if "wins" in e:
                e["wins"] = _scale_win_rows(e.get("wins"), factor)
            if "phase1Wins" in e:
                e["phase1Wins"] = _scale_win_rows(e.get("phase1Wins"), factor)
        if t == "duelBankUpdate":
            # side/dog/cat totals rebuilt after reorder; clear stale cumulatives.
            for k in ("sideTotal", "dogTotal", "catTotal"):
                if k in e:
                    e[k] = 0


def _package_amount(pkg: list[dict]) -> float:
    for e in reversed(pkg):
        if e.get("type") == "duelBankUpdate":
            return _q(int(e.get("spinWin") or 0) / 100.0)
    for e in reversed(pkg):
        if e.get("type") in {"duelSpinWin", "duelSpin"} and e.get("spinWin") is not None:
            return _q(int(e.get("spinWin") or 0) / 100.0)
    return 0.0


def _assign_order(amounts: list[float], targets: list[float]) -> list[int]:
    """Permute package indices so amounts best match target slots (greedy)."""
    n = len(amounts)
    if n == 0:
        return []
    targets = list(targets) + [0.0] * max(0, n - len(targets))
    targets = targets[:n]
    unused = set(range(n))
    order = [-1] * n
    # Fill largest targets first — better late-steal / blowout drama.
    slot_order = sorted(range(n), key=lambda i: -targets[i])
    for slot in slot_order:
        best_i = None
        best_err = None
        for i in unused:
            err = abs(amounts[i] - targets[slot])
            if best_err is None or err < best_err:
                best_err = err
                best_i = i
        assert best_i is not None
        order[slot] = best_i
        unused.remove(best_i)
    return order


def _split_duel_timeline(
    events: list[dict],
) -> tuple[list[dict], list[list[dict]], list[list[dict]], list[dict]]:
    """Split into prefix, cat packages, dog packages, suffix.

    Packages are collected in encounter order per side (spin 1..n).
    """
    prefix: list[dict] = []
    suffix: list[dict] = []
    cat_pkgs: list[list[dict]] = []
    dog_pkgs: list[list[dict]] = []
    i = 0
    n = len(events)
    while i < n and events[i].get("type") != _SPIN_START:
        prefix.append(events[i])
        i += 1

    while i < n:
        e = events[i]
        t = e.get("type")
        if t == "duelEnd" or (t not in _SIDE_EVENT_TYPES and t != _SPIN_START):
            break
        if t != _SPIN_START:
            # Orphan between packages — keep with suffix later.
            break
        side = e.get("side")
        pkg = [e]
        i += 1
        while i < n:
            nxt = events[i]
            nt = nxt.get("type")
            if nt == _SPIN_START:
                break
            if nt == "duelEnd":
                break
            if nt in _SIDE_EVENT_TYPES and nxt.get("side") not in (None, side):
                # Next side's event without closing bank — stop.
                break
            pkg.append(nxt)
            i += 1
            if nt == _SPIN_END and nxt.get("side") == side:
                break
        if side == "cat":
            cat_pkgs.append(pkg)
        elif side == "dog":
            dog_pkgs.append(pkg)
        else:
            prefix.extend(pkg)

    while i < n:
        suffix.append(events[i])
        i += 1
    return prefix, cat_pkgs, dog_pkgs, suffix


def _finalize_package(
    pkg: list[dict],
    spin_index: int,
    side_total: float,
    dog_total: float,
    cat_total: float,
) -> float:
    """Reindex package, sync line amounts, write bank cumulatives. Returns spin amount."""
    for e in pkg:
        if "spinIndex" in e:
            e["spinIndex"] = int(spin_index)
    spin_win = _sync_package_line_amounts(pkg)
    for e in pkg:
        if e.get("type") == "duelBankUpdate":
            e["spinWin"] = int(round(spin_win * 100))
            e["sideTotal"] = int(round(side_total * 100))
            e["dogTotal"] = int(round(dog_total * 100))
            e["catTotal"] = int(round(cat_total * 100))
    return spin_win


def _rebuild_events(
    prefix: list[dict],
    cat_pkgs: list[list[dict]],
    dog_pkgs: list[list[dict]],
    suffix: list[dict],
) -> list[dict]:
    """Interleave cat/dog packages (cat then dog per spin index) and reindex."""
    n = max(len(cat_pkgs), len(dog_pkgs))
    out: list[dict] = list(prefix)
    cat_total = 0.0
    dog_total = 0.0
    for si in range(n):
        spin_index = si + 1
        if si < len(cat_pkgs):
            pkg = cat_pkgs[si]
            # Provisional amount for cumulative; finalized inside helper.
            amt = _sync_package_line_amounts(pkg)
            cat_total = _q(cat_total + amt)
            _finalize_package(pkg, spin_index, cat_total, dog_total, cat_total)
            out.extend(pkg)
        if si < len(dog_pkgs):
            pkg = dog_pkgs[si]
            amt = _sync_package_line_amounts(pkg)
            dog_total = _q(dog_total + amt)
            _finalize_package(pkg, spin_index, dog_total, dog_total, cat_total)
            out.extend(pkg)
    out.extend(suffix)
    for idx, e in enumerate(out):
        e["index"] = idx
    return out


def _sum_win_rows_cents(rows: list | None) -> int | None:
    if not rows:
        return None
    return int(sum(int(w.get("win") or 0) for w in rows if isinstance(w, dict)))


def _sync_package_line_amounts(pkg: list[dict]) -> float:
    """Force spinWin/totalWin/bank delta to match line wins inside the package.

    Returns package amount in bet multiples (bank credit).
    """
    spin = next((e for e in pkg if e.get("type") == "duelSpin"), None)
    spin_win_ev = next((e for e in pkg if e.get("type") == "duelSpinWin"), None)
    bank = next((e for e in pkg if e.get("type") == "duelBankUpdate"), None)

    if spin and spin.get("swTwoBeat"):
        p1 = _sum_win_rows_cents(spin.get("phase1Wins"))
        if p1 is not None and spin.get("phase1TotalWin") is not None:
            spin["phase1TotalWin"] = p1
        p2 = _sum_win_rows_cents(spin_win_ev.get("wins") if spin_win_ev else None)
        if spin_win_ev is not None:
            if p2 is not None:
                spin_win_ev["totalWin"] = p2
                # Full bank credit = phase1 + phase2 when both known.
                full = (p1 or 0) + p2
                spin_win_ev["spinWin"] = full
            elif spin_win_ev.get("spinWin") is not None and p1 is not None:
                full = int(spin_win_ev["spinWin"])
            else:
                full = int((spin_win_ev or {}).get("spinWin") or spin.get("spinWin") or 0)
        else:
            full = int(spin.get("spinWin") or (p1 or 0))
        if bank is not None:
            bank["spinWin"] = full
        return full / 100.0

    # One-beat (or spin without phase-2 event).
    src = spin_win_ev or spin
    if src is None:
        return 0.0
    summed = _sum_win_rows_cents(src.get("wins"))
    if summed is not None:
        src["spinWin"] = summed
        if src.get("totalWin") is not None:
            src["totalWin"] = summed
        if spin is not None and spin is not src and not spin.get("swTwoBeat"):
            spin["spinWin"] = summed
            if spin.get("totalWin") is not None:
                spin["totalWin"] = summed
        if bank is not None:
            bank["spinWin"] = summed
        return summed / 100.0

    amt = int(src.get("spinWin") or 0)
    if bank is not None:
        bank["spinWin"] = amt
    return amt / 100.0


def _scale_packages_to_total(pkgs: list[list[dict]], target_total: float) -> None:
    for p in pkgs:
        _sync_package_line_amounts(p)
    amounts = [_package_amount(p) for p in pkgs]
    s = _q(sum(amounts))
    target_total = _q(target_total)
    if s <= 1e-9:
        return
    factor = target_total / s
    if abs(factor - 1.0) > 1e-12:
        for p in pkgs:
            _scale_package(p, factor)
            _sync_package_line_amounts(p)
    amounts2 = [_package_amount(p) for p in pkgs]
    drift = _q(target_total - sum(amounts2))
    if abs(drift) < 0.05 or not pkgs:
        return
    for p in reversed(pkgs):
        a = _package_amount(p)
        if a <= 0:
            continue
        _scale_package(p, (a + drift) / a)
        _sync_package_line_amounts(p)
        break


def patch_book_path_reorder(
    events: list[dict],
    cat_targets: list[float],
    dog_targets: list[float],
    cat_total: float,
    dog_total: float,
) -> list[dict]:
    """Scale packages to finals, reorder to targets, rebuild bank path."""
    prefix, cat_pkgs, dog_pkgs, suffix = _split_duel_timeline(events)
    if not cat_pkgs and not dog_pkgs:
        return events

    _scale_packages_to_total(cat_pkgs, cat_total)
    _scale_packages_to_total(dog_pkgs, dog_total)

    cat_amt = [_package_amount(p) for p in cat_pkgs]
    dog_amt = [_package_amount(p) for p in dog_pkgs]
    cat_order = _assign_order(cat_amt, cat_targets)
    dog_order = _assign_order(dog_amt, dog_targets)
    cat_pkgs = [cat_pkgs[i] for i in cat_order] if cat_order else cat_pkgs
    dog_pkgs = [dog_pkgs[i] for i in dog_order] if dog_order else dog_pkgs

    return _rebuild_events(prefix, cat_pkgs, dog_pkgs, suffix)


def patch_book_path(
    events: list[dict],
    cat_wins: list[float],
    dog_wins: list[float],
) -> None:
    """Deprecated A-M1 path (breaks board↔win). Kept for tests; prefer reorder."""
    cat_wins = list(cat_wins)
    dog_wins = list(dog_wins)
    cat_total = 0.0
    dog_total = 0.0
    spin_pos = {"cat": 0, "dog": 0}

    for e in events:
        if not isinstance(e, dict):
            continue
        t = e.get("type")
        side = e.get("side")
        if side not in spin_pos:
            continue
        i = spin_pos[side]
        wins = cat_wins if side == "cat" else dog_wins

        if t == "duelSpin":
            if i < len(wins) and not e.get("swTwoBeat"):
                e["spinWin"] = int(round(wins[i] * 100))
                if e.get("totalWin") is not None and e["spinWin"] > 0:
                    e["totalWin"] = e["spinWin"]
        elif t == "duelSpinWin":
            if i < len(wins):
                e["spinWin"] = int(round(wins[i] * 100))
                if e.get("totalWin") is not None:
                    e["totalWin"] = e["spinWin"]
        elif t == "duelBankUpdate":
            sw = wins[i] if i < len(wins) else 0.0
            if side == "cat":
                cat_total = _q(cat_total + sw)
                side_total = cat_total
            else:
                dog_total = _q(dog_total + sw)
                side_total = dog_total
            e["spinWin"] = int(round(sw * 100))
            e["sideTotal"] = int(round(side_total * 100))
            e["catTotal"] = int(round(cat_total * 100))
            e["dogTotal"] = int(round(dog_total * 100))
            spin_pos[side] = i + 1


def apply_duel_intrigue_to_book(
    events: list[Any],
    dog_total: float,
    cat_total: float,
    winner: str,
    rng: random.Random,
    scenario: str | None = None,
    reshape: bool = True,
) -> str | None:
    """Reshape path in-place via package reorder (+scale). Returns scenario id."""
    if not intrigue_enabled():
        return None

    # Work on the live list object (Book.events).
    dict_events = [e for e in events if isinstance(e, dict)]
    if len(dict_events) != len(events):
        return None

    cat_wins, dog_wins = extract_spin_wins(dict_events)
    if not cat_wins and not dog_wins:
        return None

    cat_t, dog_t = _q(cat_total), _q(dog_total)
    used = scenario or ("SCALE" if not reshape else choose_scenario(rng))

    if reshape:
        # Targets only guide reorder; actual amounts stay package-native (after scale).
        cat_targets, dog_targets = reshape_spin_wins(
            _fix_sum(list(cat_wins), cat_t) if cat_wins else cat_wins,
            _fix_sum(list(dog_wins), dog_t) if dog_wins else dog_wins,
            winner,
            used,
            rng,
        )
    else:
        used = "SCALE"
        cat_targets, dog_targets = list(cat_wins), list(dog_wins)

    new_events = patch_book_path_reorder(dict_events, cat_targets, dog_targets, cat_t, dog_t)

    # Replace contents of original list (gamestate.book.events).
    events[:] = new_events

    # Clamp final bank cumulatives to frozen settle totals (kill 0.1× rounding drift).
    _clamp_path_finals(events, dog_t, cat_t)

    for e in events:
        if isinstance(e, dict) and e.get("type") == "duelStart":
            e["intrigueScenario"] = used
            break
    return used


def _clamp_path_finals(events: list[dict], dog_total: float, cat_total: float) -> None:
    """Force last duelBankUpdate dog/cat totals to frozen finals; fix sideTotal."""
    dog_c = int(round(dog_total * 100))
    cat_c = int(round(cat_total * 100))
    last_bank = None
    for e in events:
        if isinstance(e, dict) and e.get("type") == "duelBankUpdate":
            last_bank = e
    if last_bank is None:
        return
    last_bank["dogTotal"] = dog_c
    last_bank["catTotal"] = cat_c
    side = last_bank.get("side")
    if side == "cat":
        last_bank["sideTotal"] = cat_c
    elif side == "dog":
        last_bank["sideTotal"] = dog_c
