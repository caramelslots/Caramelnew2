"""Post-opt: reshape base LUT payout distribution toward the win ladder.

Works on the **weighted** LUT (optimizer / publish_files_backup_pre_resample).
Equal-weight resampled LUTs cannot be fixed this way — match first, then resample.

Targets: tools/base_win_ladder_targets.json (mirrors library/base_win_ladder_targets.md).

Moves weight across ALL spins (lose + win bands) to hit TARGET % all, then
HIT-neutral-ish RTP polish toward --rtp (default 0.96).

Usage:
  cd third_party/math-sdk/games/0_0_meowgic
  export PYTHONPATH=../..:.
  $PY tools/match_base_win_ladder.py \\
      --lut-dir library/publish_files_backup_pre_resample
  $PY tools/win_payout_histogram.py --mode base \\
      --lut-dir library/publish_files_backup_pre_resample \\
      --md-out library/win_payout_histogram_base_ladder.md
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = Path(__file__).resolve().parent / "base_win_ladder_targets.json"
DEFAULT_LUT_DIR = ROOT / "library" / "publish_files_backup_pre_resample"
MAX_ITERS = 8_000


def _load_lut(path: Path) -> list[list]:
    rows: list[list] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            a, b, c = line.strip().split(",")[:3]
            rows.append([int(a), int(float(b)), int(float(c))])
    return rows


def _write_lut(path: Path, rows: list[list]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for sid, w, pay in rows:
            f.write(f"{sid},{w},{pay}\n")


def _is_equal_weight(rows: list[list]) -> bool:
    weights = {w for _, w, _ in rows}
    return weights == {1} or (len(weights) <= 3 and max(weights) <= 2)


def _rtp(rows: list[list], cost: float = 1.0) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    return (sum(w * pay for _, w, pay in rows) / tw / 100.0) / cost


def _mult(pay: int) -> float:
    return pay / 100.0


def _band_for(x: float, bands: list[dict]) -> int | None:
    if x <= 0:
        for i, b in enumerate(bands):
            if b.get("lose"):
                return i
        return None
    for i, b in enumerate(bands):
        if b.get("lose"):
            continue
        lo, hi = float(b["lo"]), float(b["hi"])
        open_hi = bool(b.get("open_hi"))
        if open_hi:
            if x >= lo:
                return i
        elif lo <= x < hi:
            return i
    return None


def _move(rows: list[list], donor_i: int, acceptor_i: int, amount: int) -> int:
    if amount <= 0:
        return 0
    dw = rows[donor_i][1]
    if dw <= 0:
        return 0
    moved = min(amount, dw)
    # Keep donor alive if possible (optimizer / diagnostics).
    if dw - moved <= 0 and dw > 1:
        moved = dw - 1
    if moved <= 0:
        return 0
    rows[donor_i][1] -= moved
    rows[acceptor_i][1] += moved
    return moved


def _normalize_shares(bands: list[dict]) -> None:
    s = sum(float(b["share"]) for b in bands)
    if s <= 0:
        raise SystemExit("target shares sum to 0")
    for b in bands:
        b["share"] = float(b["share"]) / s


def _band_maps(rows: list[list], bands: list[dict]) -> list[list[int]]:
    by: list[list[int]] = [[] for _ in bands]
    for i, (_sid, w, pay) in enumerate(rows):
        if w <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            by[bi].append(i)
    return by


def _shares(rows: list[list], bands: list[dict], by: list[list[int]] | None = None) -> list[float]:
    by = by or _band_maps(rows, bands)
    tw = sum(w for _, w, _ in rows) or 1.0
    return [sum(rows[i][1] for i in idxs) / tw for idxs in by]


def _heaviest(rows: list[list], idxs: list[int], *, min_w: int = 2) -> int | None:
    best_i, best_w = None, 0
    for i in idxs:
        w = rows[i][1]
        if w >= min_w and w > best_w:
            best_i, best_w = i, w
    return best_i


def match_ladder(
    rows: list[list],
    bands: list[dict],
    tol: float = 0.004,
    max_iters: int = MAX_ITERS,
) -> dict:
    """Match TARGET % all across lose + win bands (total-weight shares)."""
    by = _band_maps(rows, bands)
    rigid = [i for i, b in enumerate(bands) if not b.get("flexible")]
    empty_rigid = [i for i in rigid if not by[i]]
    if empty_rigid:
        labels = [bands[i]["label"] for i in empty_rigid]
        print(f"WARN: no books in rigid bands {labels} — those targets cannot be filled", flush=True)

    # Incremental band weight totals — avoid O(n) rescan each iter.
    bw = [sum(rows[i][1] for i in idxs) for idxs in by]
    tw = sum(bw) or 1

    stats = {"moves": 0, "iters": 0}
    stagnant = 0
    for it in range(max_iters):
        stats["iters"] = it + 1
        shares = [bw[i] / tw for i in range(len(bands))]

        over_i, over_err = None, 0.0
        under_i, under_err = None, 0.0
        for i in rigid:
            if not by[i]:
                continue
            err = shares[i] - float(bands[i]["share"])
            if err > over_err:
                over_err, over_i = err, i
            need = float(bands[i]["share"]) - shares[i]
            if need > under_err:
                under_err, under_i = need, i

        if over_i is None or under_i is None:
            break
        if over_err <= tol and under_err <= tol:
            break

        donors = by[over_i]
        acceptors = by[under_i]
        donor_i = _heaviest(rows, donors)
        if donor_i is None:
            # Spill from any over-target band that still has weight.
            for fi in range(len(bands)):
                if shares[fi] <= float(bands[fi]["share"]) - tol:
                    continue
                donor_i = _heaviest(rows, by[fi])
                if donor_i is not None:
                    over_i = fi
                    break
        if donor_i is None or not acceptors:
            break

        # Large fraction of the deficit so we converge in hundreds of moves, not 60k.
        chunk = max(1, int(tw * min(over_err, under_err) * 0.25))
        acceptor_i = acceptors[it % len(acceptors)]
        moved = _move(rows, donor_i, acceptor_i, chunk)
        if moved <= 0:
            stagnant += 1
            if stagnant > 50:
                break
            continue
        stagnant = 0
        bw[over_i] -= moved
        # acceptor may be in under_i (same as over only if spill path reused — rare)
        acc_band = _band_for(_mult(rows[acceptor_i][2]), bands)
        if acc_band is None:
            acc_band = under_i
        bw[acc_band] += moved
        stats["moves"] += 1

        if it > 0 and it % 500 == 0:
            print(
                f"  ladder iter {it}: max_over={over_err:.4f} max_under={under_err:.4f} "
                f"moves={stats['moves']}",
                flush=True,
            )

    sh = [bw[i] / tw for i in range(len(bands))]
    stats["shares"] = {
        bands[i]["label"]: round(100.0 * sh[i], 3) for i in range(len(bands))
    }
    errs = [
        abs(sh[i] - float(bands[i]["share"]))
        for i in rigid
        if by[i] or float(bands[i]["share"]) == 0
    ]
    stats["max_abs_err"] = max(errs) if errs else 0.0
    stats["ok"] = stats["max_abs_err"] <= tol + 1e-9
    return stats


def match_rtp(
    rows: list[list],
    bands: list[dict],
    target_rtp: float,
    tol: float = 0.0008,
    cost: float = 1.0,
) -> dict:
    """Adjust RTP while keeping band shares: drain/fill extremes inside each win band.

    `target_rtp` is true RTP (E[pay]/cost). For bonus_boost cost=2 → E[pay]≈1.92 at RTP 0.96.

    If still off target, allow small cross-band moves from high-EV → low-EV bands
    (ladder is re-matched in the outer loop).
    """
    by = _band_maps(rows, bands)
    sorted_by = [sorted(idxs, key=lambda i: rows[i][2]) for idxs in by]

    tw = sum(w for _, w, _ in rows) or 1
    pay_mass = sum(w * pay for _, w, pay in rows)  # cents * weight
    cost = float(cost) if cost else 1.0

    def cur_rtp() -> float:
        return (pay_mass / tw / 100.0) / cost

    def apply_move(d: int, a: int, chunk: int) -> int:
        nonlocal pay_mass, moves
        moved = _move(rows, d, a, chunk)
        if moved <= 0:
            return 0
        pay_mass += moved * (rows[a][2] - rows[d][2])
        moves += 1
        return moved

    moves = 0
    # Pass 1: aggressive within-band (preserves ladder shares exactly).
    for bi, idxs_sorted in enumerate(sorted_by):
        if bands[bi].get("lose") or len(idxs_sorted) < 2:
            continue
        for _ in range(2_000):
            cur = cur_rtp()
            if abs(cur - target_rtp) <= tol:
                return {"moves": moves, "rtp": cur, "ok": True}
            richer = cur < target_rtp
            n = len(idxs_sorted)
            low = idxs_sorted[: max(1, n // 2)]
            high = idxs_sorted[-(max(1, n // 2)) :]
            if richer:
                d = _heaviest(rows, low)
                acceptors = [i for i in high if rows[i][2] > (rows[d][2] if d is not None else -1)]
            else:
                d = _heaviest(rows, high)
                acceptors = [i for i in low if d is not None and rows[i][2] < rows[d][2]]
            if d is None or not acceptors:
                break
            a = min(acceptors, key=lambda i: rows[i][2]) if not richer else max(
                acceptors, key=lambda i: rows[i][2]
            )
            # Big chunks — within-band only changes EV, not shares.
            chunk = max(1, int(rows[d][1] * 0.5))
            if apply_move(d, a, chunk) <= 0:
                break

    # Pass 2: cross-band if still off (trades a bit of ladder for RTP).
    for it in range(3_000):
        cur = cur_rtp()
        if abs(cur - target_rtp) <= tol:
            break
        richer = cur < target_rtp
        # Rank bands by mean payout (weight-aware).
        means = []
        for bi, idxs in enumerate(by):
            if bands[bi].get("lose") or not idxs:
                means.append((bi, 0.0))
                continue
            wsum = sum(rows[i][1] for i in idxs) or 1
            means.append((bi, sum(rows[i][1] * rows[i][2] for i in idxs) / wsum))
        means_sorted = sorted(means, key=lambda t: t[1])
        if richer:
            donor_bands = [bi for bi, m in means_sorted if m > 0][:8]
            acceptor_bands = [bi for bi, m in reversed(means_sorted) if m > 0][:8]
        else:
            donor_bands = [bi for bi, m in reversed(means_sorted) if m > 0][:8]
            acceptor_bands = [bi for bi, m in means_sorted if True][:8]  # incl. lose
        progressed = False
        for dbi in donor_bands:
            d = _heaviest(rows, by[dbi])
            if d is None:
                continue
            for abi in acceptor_bands:
                if abi == dbi or not by[abi]:
                    continue
                # Prefer extreme acceptor pay for RTP direction.
                if richer:
                    a = max(by[abi], key=lambda i: rows[i][2])
                    if rows[a][2] <= rows[d][2]:
                        continue
                else:
                    a = min(by[abi], key=lambda i: rows[i][2])
                    if rows[a][2] >= rows[d][2]:
                        continue
                chunk = max(1, int(tw * abs(cur - target_rtp) * 0.15))
                if apply_move(d, a, chunk) > 0:
                    progressed = True
                    break
            if progressed:
                break
        if not progressed:
            break
        if it > 0 and it % 400 == 0:
            print(f"  rtp iter {it}: RTP={cur_rtp():.4f} moves={moves}", flush=True)

    return {"moves": moves, "rtp": cur_rtp(), "ok": abs(cur_rtp() - target_rtp) <= tol}


def compare_report(rows: list[list], bands: list[dict]) -> list[dict]:
    by = _band_maps(rows, bands)
    sh = _shares(rows, bands, by)
    out = []
    for i, b in enumerate(bands):
        out.append(
            {
                "label": b["label"],
                "target_pct": round(100.0 * float(b["share"]), 3),
                "actual_pct": round(100.0 * sh[i], 3),
                "delta_pp": round(100.0 * (sh[i] - float(b["share"])), 3),
                "books": len(by[i]),
            }
        )
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--lut-dir", type=Path, default=DEFAULT_LUT_DIR)
    ap.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    ap.add_argument("--mode", default="base")
    ap.add_argument("--tol", type=float, default=0.004, help="abs share tol (fraction)")
    ap.add_argument("--rtp", type=float, default=0.96)
    ap.add_argument("--rtp-tol", type=float, default=0.004)
    ap.add_argument("--rounds", type=int, default=4)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--also-publish",
        action="store_true",
        help="Also write matched LUT into library/publish_files (still weighted).",
    )
    args = ap.parse_args()

    targets = json.loads(args.targets.read_text(encoding="utf-8"))
    bands = targets["bands"]
    _normalize_shares(bands)
    cost = float(targets.get("cost", 1.0))
    target_rtp = float(args.rtp if args.rtp is not None else targets.get("target_rtp", 0.96))

    lut_path = args.lut_dir / f"lookUpTable_{args.mode}_0.csv"
    if not lut_path.exists():
        raise SystemExit(f"missing LUT {lut_path}")

    rows = _load_lut(lut_path)
    if _is_equal_weight(rows):
        raise SystemExit(
            f"{lut_path} looks equal-weight. Use publish_files_backup_pre_resample (weighted)."
        )

    before = {
        "rtp": _rtp(rows, cost),
        "p_lose": sum(w for _, w, p in rows if p <= 0) / sum(w for _, w, _ in rows),
    }
    print(
        f"{args.mode}: rows={len(rows)} P(lose)={before['p_lose']:.4f} "
        f"RTP={before['rtp']:.4f}",
        flush=True,
    )

    for r in range(args.rounds):
        print(f"round {r}: matching ladder…", flush=True)
        body = match_ladder(rows, bands, tol=args.tol)
        print(f"round {r}: matching RTP…", flush=True)
        rtp = match_rtp(
            rows, bands, target_rtp, tol=min(0.001, args.rtp_tol), cost=cost
        )
        print(
            f"round {r}: ladder_moves={body['moves']} max_err={body['max_abs_err']:.4f} "
            f"rtp_moves={rtp['moves']} RTP={rtp['rtp']:.4f}",
            flush=True,
        )
        if body["max_abs_err"] <= args.tol and abs(rtp["rtp"] - target_rtp) <= args.rtp_tol:
            break

    # Final ladder pass after RTP.
    print("final ladder + RTP pass…", flush=True)
    body = match_ladder(rows, bands, tol=args.tol)
    rtp = match_rtp(rows, bands, target_rtp, tol=args.rtp_tol, cost=cost)
    rep = compare_report(rows, bands)
    after_rtp = _rtp(rows, cost)
    p_lose = sum(w for _, w, p in rows if p <= 0) / sum(w for _, w, _ in rows)

    print("band comparison (target vs actual % all):", flush=True)
    for row in rep:
        flag = " " if abs(row["delta_pp"]) <= args.tol * 100 + 0.15 else "!"
        print(
            f"  {flag} {row['label']:12} tgt={row['target_pct']:7.3f}%  "
            f"act={row['actual_pct']:7.3f}%  Δ={row['delta_pp']:+7.3f}  "
            f"books={row['books']}",
            flush=True,
        )
    print(f"after: P(lose)={p_lose:.4f} RTP={after_rtp:.4f}", flush=True)

    rtp_ok = abs(after_rtp - target_rtp) <= args.rtp_tol
    ladder_ok = body["max_abs_err"] <= args.tol + 0.01  # slightly soft gate

    if args.dry_run:
        print("dry-run: not writing")
        raise SystemExit(0 if rtp_ok and ladder_ok else 2)

    _write_lut(lut_path, rows)
    print(f"wrote {lut_path}", flush=True)
    if args.also_publish:
        pub = ROOT / "library" / "publish_files" / lut_path.name
        shutil.copy2(lut_path, pub)
        print(f"copied → {pub}", flush=True)

    if not rtp_ok or not ladder_ok:
        print(
            f"WARNING: rtp_ok={rtp_ok} ladder_ok={ladder_ok} "
            f"(max_err={body['max_abs_err']:.4f})",
            flush=True,
        )
        raise SystemExit(2)


if __name__ == "__main__":
    main()
