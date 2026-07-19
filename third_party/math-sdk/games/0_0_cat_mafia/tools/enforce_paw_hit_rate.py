"""Post-optimizer LUT fix (weighted publish / pre-resample LUT).

1) Floor `paw` weight share (default ≥3%) — move weight from dead.
2) Match RTP to ~96.01%:
   - if low:  dead → basegame / freegame / sw_expand
   - if high: basegame / freegame / sw_expand → dead
   Paw share is left alone after step 1.

Important: run on the **weighted** LUT (optimizer output), then `resample_books.py`.
Equal-weight resampled LUTs (all weights=1) cannot be fixed this way.

Usage:
  cd games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  # typical after opt + before resample:
  $PY tools/enforce_paw_hit_rate.py --mode base --lut-dir library/publish_files
  # if you already resampled, patch the backup then resample again:
  $PY tools/enforce_paw_hit_rate.py --mode base --lut-dir library/publish_files_backup_pre_resample
  $PY tools/resample_books.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "library"

DONORS_DEAD = ("0", "0_cluster")
PAYING = ("basegame", "freegame", "sw_expand")


def _load_seg(path: Path) -> dict[int, str]:
    out: dict[int, str] = {}
    with path.open() as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) >= 2:
                out[int(parts[0])] = parts[1]
    return out


def _load_lut(path: Path) -> list[tuple[int, int, int]]:
    rows: list[tuple[int, int, int]] = []
    with path.open() as f:
        for line in f:
            a, b, c = line.strip().split(",")[:3]
            rows.append((int(a), int(float(b)), int(float(c))))
    return rows


def _write_lut(path: Path, rows: list[tuple[int, int, int]]) -> None:
    with path.open("w") as f:
        for sid, w, pay in rows:
            f.write(f"{sid},{w},{pay}\n")


def _rtp(rows: list[tuple[int, int, int]]) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    return sum(w * pay for _, w, pay in rows) / tw / 100.0


def _weight_pct(rows: list[tuple[int, int, int]], crit: dict[int, str], name: str) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    return sum(w for sid, w, _ in rows if crit.get(sid) == name) / tw


def _is_equal_weight(rows: list[tuple[int, int, int]]) -> bool:
    weights = {w for _, w, _ in rows}
    return weights == {1} or (len(weights) <= 3 and max(weights) <= 2)


def _move_weight(
    rows: list[tuple[int, int, int]],
    crit: dict[int, str],
    from_names: tuple[str, ...],
    to_names: tuple[str, ...],
    amount: float,
) -> list[tuple[int, int, int]]:
    if amount <= 0:
        return rows
    total = sum(w for _, w, _ in rows)
    by_id = {sid: (w, pay) for sid, w, pay in rows}
    from_ids = [sid for sid in by_id if crit.get(sid) in from_names and by_id[sid][0] > 1]
    to_ids = [sid for sid in by_id if crit.get(sid) in to_names and by_id[sid][0] > 0]
    if not from_ids or not to_ids:
        raise SystemExit(
            f"cannot move weight: from={from_names}({len(from_ids)}) to={to_names}({len(to_ids)})"
        )

    from_w = sum(by_id[sid][0] for sid in from_ids)
    to_w = sum(by_id[sid][0] for sid in to_ids)
    max_take = sum(by_id[sid][0] - 1 for sid in from_ids)
    amount = min(float(amount), float(max_take), float(from_w))
    if amount <= 0:
        return rows

    new_w = {sid: w for sid, (w, _) in by_id.items()}
    for sid in from_ids:
        take = amount * (by_id[sid][0] / from_w)
        new_w[sid] = max(1, int(round(by_id[sid][0] - take)))

    moved = sum(by_id[sid][0] - new_w[sid] for sid in from_ids)
    for sid in to_ids:
        add = moved * (by_id[sid][0] / to_w)
        new_w[sid] = max(1, int(round(by_id[sid][0] + add)))

    drift = total - sum(new_w.values())
    if drift != 0:
        anchor = max(from_ids, key=lambda s: new_w[s])
        new_w[anchor] = max(1, new_w[anchor] + drift)

    return [(sid, new_w[sid], by_id[sid][1]) for sid, _, _ in rows]


def _avg_pay_cents(rows: list[tuple[int, int, int]], crit: dict[int, str], names: tuple[str, ...]) -> float:
    tw = wp = 0
    for sid, w, pay in rows:
        if crit.get(sid) in names and w > 0:
            tw += w
            wp += w * pay
    return wp / tw if tw else 0.0


def enforce_paw(rows, crit, target: float):
    total = sum(w for _, w, _ in rows)
    paw_w = sum(w for sid, w, _ in rows if crit.get(sid) == "paw")
    cur = paw_w / total if total else 0.0
    if cur + 1e-12 >= target:
        print(f"  paw already {100 * cur:.3f}% >= {100 * target:.2f}%")
        return rows
    need = target * total - paw_w
    print(f"  paw {100 * cur:.3f}% → {100 * target:.2f}%")
    return _move_weight(rows, crit, DONORS_DEAD, ("paw",), need)


def match_rtp(rows, crit, target_avg_win: float, tol: float = 0.0005):
    """Match weighted average win (bet multiples). RTP = avg_win / cost."""
    total = sum(w for _, w, _ in rows)
    cur = _rtp(rows)
    if abs(cur - target_avg_win) <= tol:
        print(f"  avg_win already {cur:.4f} (~{target_avg_win:.4f})")
        return rows

    avg_pay = _avg_pay_cents(rows, crit, PAYING)
    if avg_pay <= 0:
        raise SystemExit("no paying books for RTP match")

    if cur < target_avg_win:
        need = target_avg_win - cur
        moved = need * total * 100.0 / avg_pay
        print(f"  avg_win {cur:.4f} → {target_avg_win:.4f} (dead → paying, move≈{moved:.0f})")
        rows = _move_weight(rows, crit, DONORS_DEAD, PAYING, moved)
    else:
        need = cur - target_avg_win
        moved = need * total * 100.0 / avg_pay
        print(f"  avg_win {cur:.4f} → {target_avg_win:.4f} (paying → dead, move≈{moved:.0f})")
        rows = _move_weight(rows, crit, PAYING, DONORS_DEAD, moved)

    for _ in range(4):
        r = _rtp(rows)
        if abs(r - target_avg_win) <= tol:
            break
        avg_pay = _avg_pay_cents(rows, crit, PAYING)
        if avg_pay <= 0:
            break
        extra = abs(target_avg_win - r) * total * 100.0 / avg_pay
        if extra < 1:
            break
        if r < target_avg_win:
            rows = _move_weight(rows, crit, DONORS_DEAD, PAYING, extra)
        else:
            rows = _move_weight(rows, crit, PAYING, DONORS_DEAD, extra)
    return rows


def process_file(
    path: Path,
    crit: dict[int, str],
    paw_target: float,
    rtp_target: float,
    cost: float,
) -> None:
    rows = _load_lut(path)
    before_paw = _weight_pct(rows, crit, "paw")
    before_avg = _rtp(rows)
    target_avg = rtp_target * cost

    if _is_equal_weight(rows):
        print(
            f"{path.name}: equal-weight LUT (resampled). "
            f"Patch pre-resample weighted LUT instead, then re-run resample_books.py"
        )
        print(f"  current paw={100 * before_paw:.3f}% avg_win={before_avg:.4f}")
        return

    rows = enforce_paw(rows, crit, paw_target)
    rows = match_rtp(rows, crit, target_avg)
    after_paw = _weight_pct(rows, crit, "paw")
    after_avg = _rtp(rows)
    _write_lut(path, rows)
    print(
        f"{path.name}: paw {100 * before_paw:.3f}% → {100 * after_paw:.3f}% | "
        f"avg_win {before_avg:.4f} → {after_avg:.4f} "
        f"(RTP≈{after_avg / cost:.4f} at cost={cost:g})"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="base")
    ap.add_argument("--paw", type=float, default=0.03)
    ap.add_argument("--rtp", type=float, default=0.9601, help="target RTP (return / cost)")
    ap.add_argument(
        "--cost",
        type=float,
        default=None,
        help="bet mode cost (base=1, bonus_boost=2). Default from mode name.",
    )
    ap.add_argument(
        "--lut-dir",
        default="library/publish_files_backup_pre_resample",
        help="directory with lookUpTable_<mode>_0.csv (weighted)",
    )
    args = ap.parse_args()

    cost_default = {"base": 1.0, "bonus_boost": 2.0, "bonus_normal": 100.0, "bonus_super": 200.0}
    cost = args.cost if args.cost is not None else cost_default.get(args.mode, 1.0)

    seg = LIBRARY / "lookup_tables" / f"lookUpTableSegmented_{args.mode}.csv"
    if not seg.exists():
        raise SystemExit(f"missing {seg}")
    crit = _load_seg(seg)

    lut_dir = Path(args.lut_dir)
    if not lut_dir.is_absolute():
        lut_dir = ROOT / lut_dir
    path = lut_dir / f"lookUpTable_{args.mode}_0.csv"
    if not path.exists():
        raise SystemExit(f"missing {path}")
    process_file(path, crit, args.paw, args.rtp, cost)


if __name__ == "__main__":
    main()
