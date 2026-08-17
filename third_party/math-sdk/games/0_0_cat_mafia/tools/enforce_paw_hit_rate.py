"""Post-optimizer LUT fix (weighted publish / pre-resample LUT).

1) Floor `paw` weight share (default ≥3%) — move weight from dead.
   Segment-based: the paw fence guarantees criteria=="paw" == pawCoinResolve event.
2) Floor `sw` (Wild Curtain) EVENT share (`--sw`, default off) — event-based:
   scans books_<mode>.jsonl.zst for superWildExpand in the BASE part of the book
   (before any free-spin marker). Needed now that SW lands naturally from BR0
   strips: the "sw_expand" criteria segment ≠ the curtain event (natural
   curtains also appear inside basegame-segment books).
3) Match HIT rate (`--hit`, default off) — weight share of paying books
   (pay > 0) via dead ↔ paying moves. Feature-floored books (paw segment,
   sw-event ids), freegame segment and wincap segments are protected so the
   floors and the FS rate survive.
4) Match RTP (`--rtp`, default 0.9601) HIT-neutrally — moves weight INSIDE
   the adjustable paying pool (low-pay ↔ high-pay), so the hit rate from
   step 3 is preserved. (The legacy dead ↔ paying RTP match fought the hit
   target: every dead ↔ paying leg moves hit and RTP together.)

Important: run on the **weighted** LUT (optimizer output), then `resample_books.py`.
Equal-weight resampled LUTs (all weights=1) cannot be fixed this way.

Usage:
  cd games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  # typical after opt + before resample:
  $PY tools/enforce_paw_hit_rate.py --mode base --lut-dir library/publish_files \
      --paw 0.03 --sw 0.03 --hit 0.3708 --rtp 0.9601
  # if you already resampled, patch the backup then resample again:
  $PY tools/enforce_paw_hit_rate.py --mode base --lut-dir library/publish_files_backup_pre_resample ...
  $PY tools/resample_books.py
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import zstandard as zstd

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "library"

DONORS_DEAD = ("0", "0_cluster")
PAYING = ("basegame", "freegame", "sw_expand")
PROTECTED_SEGMENTS = ("paw", "freegame", "wincap", "wincap_max")
FS_MARKERS = {"enterFreeSpin", "freeSpinTrigger", "freeSpinTargetPick", "startFreeSpin"}


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


def _hit_rate(rows: list[tuple[int, int, int]]) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    return sum(w for _, w, pay in rows if pay > 0) / tw


def _is_equal_weight(rows: list[tuple[int, int, int]]) -> bool:
    weights = {w for _, w, _ in rows}
    return weights == {1} or (len(weights) <= 3 and max(weights) <= 2)


def _scan_sw_event_ids(books_path: Path) -> set[int]:
    """Ids of books whose BASE part (before FS markers) has superWildExpand."""
    ids: set[int] = set()
    dctx = zstd.ZstdDecompressor()
    with open(books_path, "rb") as fh, dctx.stream_reader(fh) as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            if not line.strip():
                continue
            book = json.loads(line)
            types = [e.get("type") for e in (book.get("events") or [])]
            fs_idx = next((i for i, t in enumerate(types) if t in FS_MARKERS), None)
            sw_idx = next((i for i, t in enumerate(types) if t == "superWildExpand"), None)
            if sw_idx is not None and (fs_idx is None or sw_idx < fs_idx):
                ids.add(int(book["id"]))
    return ids


def _move_weight_core(
    rows: list[tuple[int, int, int]],
    from_ids: list[int],
    to_ids: list[int],
    amount: float,
) -> list[tuple[int, int, int]]:
    if amount <= 0:
        return rows
    total = sum(w for _, w, _ in rows)
    by_id = {sid: (w, pay) for sid, w, pay in rows}
    from_ids = [sid for sid in from_ids if by_id.get(sid, (0, 0))[0] > 1]
    to_ids = [sid for sid in to_ids if by_id.get(sid, (0, 0))[0] > 0]
    if not from_ids or not to_ids:
        raise SystemExit(
            f"cannot move weight: from({len(from_ids)}) to({len(to_ids)}) amount={amount:.0f}"
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


def _move_weight(
    rows: list[tuple[int, int, int]],
    crit: dict[int, str],
    from_names: tuple[str, ...],
    to_names: tuple[str, ...],
    amount: float,
) -> list[tuple[int, int, int]]:
    by_id = {sid: (w, pay) for sid, w, pay in rows}
    from_ids = [sid for sid in by_id if crit.get(sid) in from_names]
    to_ids = [sid for sid in by_id if crit.get(sid) in to_names]
    return _move_weight_core(rows, from_ids, to_ids, amount)


def _avg_pay_cents(rows: list[tuple[int, int, int]], ids: list[int]) -> float:
    tw = wp = 0
    by_id = {sid: (w, pay) for sid, w, pay in rows}
    for sid in ids:
        w, pay = by_id[sid]
        if w > 0:
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


def enforce_sw(rows, sw_ids: set[int], dead_ids: list[int], target: float):
    """Floor the base-part superWildExpand EVENT share (id-based)."""
    total = sum(w for _, w, _ in rows)
    sw_w = sum(w for sid, w, _ in rows if sid in sw_ids)
    cur = sw_w / total if total else 0.0
    if cur + 1e-12 >= target:
        print(f"  sw already {100 * cur:.3f}% >= {100 * target:.2f}%")
        return rows
    if not sw_ids:
        raise SystemExit("no base-part superWildExpand books found — check BR0 strips / sims")
    need = target * total - sw_w
    print(f"  sw {100 * cur:.3f}% → {100 * target:.2f}% (event-based, {len(sw_ids)} books)")
    return _move_weight_core(rows, dead_ids, sorted(sw_ids), need)


def match_hit_rate(rows, target: float, protect_ids: set[int], tol: float = 0.0025):
    """Match hit rate (weight share of paying books) via dead ↔ paying moves."""
    total = sum(w for _, w, _ in rows)
    for _ in range(6):
        cur = _hit_rate(rows)
        if abs(cur - target) <= tol:
            break
        by_id = {sid: (w, pay) for sid, w, pay in rows}
        dead = [sid for sid, (w, pay) in by_id.items() if pay == 0]
        paying = [
            sid for sid, (w, pay) in by_id.items() if pay > 0 and sid not in protect_ids
        ]
        gap = abs(cur - target) * total
        if cur > target:
            print(f"  hit {100 * cur:.3f}% → {100 * target:.2f}% (paying → dead)")
            rows = _move_weight_core(rows, paying, dead, gap)
        else:
            print(f"  hit {100 * cur:.3f}% → {100 * target:.2f}% (dead → paying)")
            rows = _move_weight_core(rows, dead, paying, gap)
    return rows


def match_rtp(rows, target_avg_win: float, protect_ids: set[int], tol: float = 0.0005):
    """Match weighted avg win HIT-neutrally: move weight inside the adjustable
    paying pool (low-pay ↔ high-pay), never across the dead/paying boundary."""
    total = sum(w for _, w, _ in rows)
    for _ in range(6):
        cur = _rtp(rows)
        if abs(cur - target_avg_win) <= tol:
            break
        by_id = {sid: (w, pay) for sid, w, pay in rows}
        pool = [sid for sid, (w, pay) in by_id.items() if pay > 0 and sid not in protect_ids]
        if not pool:
            print("  WARN: no adjustable paying books for RTP match")
            break
        avg = _avg_pay_cents(rows, pool)
        low = [sid for sid in pool if 0 < by_id[sid][1] < avg]
        high = [sid for sid in pool if by_id[sid][1] > avg]
        if not low or not high:
            print("  WARN: paying pool has no low/high spread for RTP match")
            break
        avg_low = _avg_pay_cents(rows, low)
        avg_high = _avg_pay_cents(rows, high)
        spread = avg_high - avg_low
        if spread <= 0:
            break
        need = abs(target_avg_win - cur) * total * 100.0 / spread
        if cur < target_avg_win:
            print(f"  avg_win {cur:.4f} → {target_avg_win:.4f} (low-pay → high-pay)")
            rows = _move_weight_core(rows, low, high, need)
        else:
            print(f"  avg_win {cur:.4f} → {target_avg_win:.4f} (high-pay → low-pay)")
            rows = _move_weight_core(rows, high, low, need)
    return rows


def process_file(
    lut_path: Path,
    books_path: Path,
    crit: dict[int, str],
    paw_target: float,
    sw_target: float,
    hit_target: float | None,
    rtp_target: float,
    cost: float,
) -> None:
    rows = _load_lut(lut_path)
    before_paw = _weight_pct(rows, crit, "paw")
    before_avg = _rtp(rows)
    before_hit = _hit_rate(rows)
    target_avg = rtp_target * cost

    if _is_equal_weight(rows):
        print(
            f"{lut_path.name}: equal-weight LUT (resampled). "
            f"Patch pre-resample weighted LUT instead, then re-run resample_books.py"
        )
        print(f"  current paw={100 * before_paw:.3f}% avg_win={before_avg:.4f}")
        return

    sw_ids: set[int] = set()
    if sw_target > 0:
        if not books_path.exists():
            raise SystemExit(f"missing {books_path} (needed for event-based sw floor)")
        sw_ids = _scan_sw_event_ids(books_path)
        before_sw = sum(w for sid, w, _ in rows if sid in sw_ids) / sum(
            w for _, w, _ in rows
        )
        print(f"  sw event share before: {100 * before_sw:.3f}% ({len(sw_ids)} books)")

    protect_ids = {sid for sid, _, _ in rows if crit.get(sid) in PROTECTED_SEGMENTS} | sw_ids
    dead_ids = [sid for sid, w, pay in rows if pay == 0]

    rows = enforce_paw(rows, crit, paw_target)
    if sw_target > 0:
        rows = enforce_sw(rows, sw_ids, dead_ids, sw_target)
    if hit_target is not None:
        rows = match_hit_rate(rows, hit_target, protect_ids)
    rows = match_rtp(rows, target_avg, protect_ids)

    after_paw = _weight_pct(rows, crit, "paw")
    after_avg = _rtp(rows)
    after_hit = _hit_rate(rows)
    total = sum(w for _, w, _ in rows)
    after_sw = sum(w for sid, w, _ in rows if sid in sw_ids) / total if sw_ids else 0.0
    _write_lut(lut_path, rows)
    print(
        f"{lut_path.name}: paw {100 * before_paw:.3f}% → {100 * after_paw:.3f}% | "
        f"avg_win {before_avg:.4f} → {after_avg:.4f} "
        f"(RTP≈{after_avg / cost:.4f} at cost={cost:g})"
    )
    print(
        f"  final: hit {100 * after_hit:.3f}%"
        + (f" (target {100 * hit_target:.2f}%)" if hit_target is not None else "")
        + (f" | sw {100 * after_sw:.3f}% (target {100 * sw_target:.2f}%)" if sw_ids else "")
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="base")
    ap.add_argument("--paw", type=float, default=0.03)
    ap.add_argument("--sw", type=float, default=0.0, help="base-part curtain event floor")
    ap.add_argument("--hit", type=float, default=None, help="target hit rate (pay>0 share)")
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
    process_file(
        path,
        lut_dir / f"books_{args.mode}.jsonl.zst",
        crit,
        args.paw,
        args.sw,
        args.hit,
        args.rtp,
        cost,
    )


if __name__ == "__main__":
    main()
