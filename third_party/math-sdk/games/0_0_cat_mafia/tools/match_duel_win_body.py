"""Post-opt: reshape duel_win payout-band weights toward SMOOTH · VH targets.

Run on the **weighted** LUT (optimizer output / publish_files_backup_pre_resample),
THEN resample. Equal-weight resampled LUTs cannot be fixed this way.

Moves weight only among paying books (pay>0). Lose weight (hit-rate) is preserved.
Optionally nudges RTP back to target by low↔high moves inside paying pool.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/match_duel_win_body.py --mode bonus_duel_cat \\
      --lut-dir library/publish_files_backup_pre_resample --rtp 0.9601
  $PY tools/duel_payout_histogram.py --lut-dir library/publish_files_backup_pre_resample
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS_PATH = Path(__file__).resolve().parent / "duel_smooth_vh_targets.json"
COST = 150.0
MAX_ITERS = 8000


def _load_lut(path: Path) -> list[list]:
    rows = []
    with path.open() as f:
        for line in f:
            a, b, c = line.strip().split(",")[:3]
            rows.append([int(a), int(float(b)), int(float(c))])
    return rows


def _write_lut(path: Path, rows: list[list]) -> None:
    with path.open("w") as f:
        for sid, w, pay in rows:
            f.write(f"{sid},{w},{pay}\n")


def _is_equal_weight(rows: list[list]) -> bool:
    weights = {w for _, w, _ in rows}
    return weights == {1} or (len(weights) <= 3 and max(weights) <= 2)


def _rtp(rows: list[list], cost: float = COST) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    # pay is multiplier×100; average win in bet-mult = sum(w*pay)/tw/100
    return (sum(w * pay for _, w, pay in rows) / tw / 100.0) / cost


def _mult(pay: int) -> float:
    return pay / 100.0


def _band_for(x: float, bands: list[dict]) -> int | None:
    if x <= 0:
        return None
    for i, b in enumerate(bands):
        lo, hi = float(b["lo"]), float(b["hi"])
        if hi >= 25000:
            if x >= lo:
                return i
        elif lo <= x < hi:
            return i
    return None


def _win_weight(rows: list[list]) -> float:
    return sum(w for _, w, pay in rows if pay > 0)


def _band_weights(rows: list[list], bands: list[dict]) -> list[float]:
    out = [0.0] * len(bands)
    for _, w, pay in rows:
        if pay <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            out[bi] += w
    return out


def _move(rows: list[list], donor_i: int, acceptor_i: int, amount: int) -> int:
    """Move `amount` weight from donor row to acceptor row. Returns moved."""
    if amount <= 0:
        return 0
    dw = rows[donor_i][1]
    if dw <= 0:
        return 0
    moved = min(amount, dw)
    # leave at least 1 weight if possible so book stays in LUT
    if dw - moved <= 0 and dw > 1:
        moved = dw - 1
    if moved <= 0:
        return 0
    rows[donor_i][1] -= moved
    rows[acceptor_i][1] += moved
    return moved


def match_body(rows: list[list], bands: list[dict], tol: float = 0.015) -> dict:
    """Match share of win-weight per band to targets (non-flexible bands hard)."""
    win_w = _win_weight(rows)
    if win_w <= 0:
        return {"ok": False, "reason": "no paying weight"}

    # indices of books by band
    by_band: list[list[int]] = [[] for _ in bands]
    for i, (_sid, w, pay) in enumerate(rows):
        if pay <= 0 or w <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            by_band[bi].append(i)

    rigid = [i for i, b in enumerate(bands) if not b.get("flexible")]
    stats = {"moves": 0, "iters": 0}

    for it in range(MAX_ITERS):
        stats["iters"] = it + 1
        win_w = _win_weight(rows)
        bw = _band_weights(rows, bands)
        shares = [bw[i] / win_w for i in range(len(bands))]
        # find worst over / under among rigid bands
        over_i, over_err = None, 0.0
        under_i, under_err = None, 0.0
        for i in rigid:
            target = float(bands[i]["share"])
            err = shares[i] - target
            if err > over_err:
                over_err, over_i = err, i
            if -err > under_err:
                under_err, under_i = -err, i
        if over_i is None or under_i is None:
            break
        if over_err <= tol and under_err <= tol:
            break
        donors = [i for i in by_band[over_i] if rows[i][1] > 1]
        acceptors = by_band[under_i]
        if not donors or not acceptors:
            # try flexible bands as donors/acceptors
            if not donors:
                for fi in range(len(bands)):
                    if bands[fi].get("flexible"):
                        donors = [i for i in by_band[fi] if rows[i][1] > 1]
                        if donors:
                            over_i = fi
                            break
            if not acceptors:
                break
            if not donors:
                break
        # move a chunk proportional to error
        chunk = max(1, int(win_w * min(over_err, under_err) * 0.05))
        donor_i = max(donors, key=lambda i: rows[i][1])
        acceptor_i = min(acceptors, key=lambda i: rows[i][1])  # spread to thin books too
        # prefer acceptor with some weight already, else any
        acceptor_i = acceptors[it % len(acceptors)]
        moved = _move(rows, donor_i, acceptor_i, chunk)
        if moved <= 0:
            break
        stats["moves"] += 1

    win_w = _win_weight(rows)
    bw = _band_weights(rows, bands)
    stats["shares"] = {
        bands[i]["label"]: round(100.0 * bw[i] / win_w, 3) for i in range(len(bands))
    }
    stats["ok"] = True
    return stats


def match_rtp(rows: list[list], target_rtp: float, cost: float = COST, tol: float = 0.0005) -> dict:
    """HIT-neutral RTP tweak: move weight between low-pay and high-pay winners."""
    paying = [(i, rows[i][2]) for i in range(len(rows)) if rows[i][2] > 0 and rows[i][1] > 0]
    if not paying:
        return {"ok": False}
    paying_sorted = sorted(paying, key=lambda t: t[1])
    low = [i for i, _ in paying_sorted[: max(1, len(paying_sorted) // 3)]]
    high = [i for i, _ in paying_sorted[-(max(1, len(paying_sorted) // 3)) :]]
    moves = 0
    for _ in range(4000):
        cur = _rtp(rows, cost)
        if abs(cur - target_rtp) <= tol:
            break
        if cur > target_rtp:
            # too rich → move high → low
            donors = [i for i in high if rows[i][1] > 1]
            acceptors = low
        else:
            donors = [i for i in low if rows[i][1] > 1]
            acceptors = high
        if not donors or not acceptors:
            break
        d = max(donors, key=lambda i: rows[i][1])
        a = acceptors[moves % len(acceptors)]
        if _move(rows, d, a, max(1, rows[d][1] // 50)) <= 0:
            break
        moves += 1
    return {"ok": True, "moves": moves, "rtp": _rtp(rows, cost)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", required=True, choices=["bonus_duel_cat", "bonus_duel_dog"])
    ap.add_argument(
        "--lut-dir",
        type=Path,
        default=ROOT / "library" / "publish_files_backup_pre_resample",
    )
    ap.add_argument("--targets", type=Path, default=TARGETS_PATH)
    ap.add_argument("--tol", type=float, default=0.015, help="band share abs tol (fraction of wins)")
    ap.add_argument("--rtp", type=float, default=0.9601)
    ap.add_argument("--skip-rtp", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    targets = json.loads(args.targets.read_text())[args.mode]
    bands = targets["bands"]
    lut_path = args.lut_dir / f"lookUpTable_{args.mode}_0.csv"
    if not lut_path.exists():
        raise SystemExit(f"missing LUT {lut_path}")

    rows = _load_lut(lut_path)
    if _is_equal_weight(rows):
        raise SystemExit(
            f"{lut_path} looks equal-weight. Run on weighted pre-resample LUT instead."
        )

    before_rtp = _rtp(rows)
    win_w = _win_weight(rows)
    tw = sum(w for _, w, _ in rows)
    print(f"{args.mode}: rows={len(rows)} P(win)={win_w/tw:.4f} RTP={before_rtp:.4f}")

    body = match_body(rows, bands, tol=args.tol)
    print("body:", json.dumps(body, indent=2))
    if not args.skip_rtp:
        rtp_stats = match_rtp(rows, args.rtp)
        print("rtp:", rtp_stats)

    after_rtp = _rtp(rows)
    win_w2 = _win_weight(rows)
    print(f"after: P(win)={win_w2/tw:.4f} RTP={after_rtp:.4f}")

    if args.dry_run:
        print("dry-run: not writing")
        return
    _write_lut(lut_path, rows)
    print(f"wrote {lut_path}")


if __name__ == "__main__":
    main()
