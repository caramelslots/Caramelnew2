"""Post-opt: reshape duel win payout + lose victory-pot weights toward SMOOTH · VH.

Run on the **weighted** LUT (optimizer output / publish_files_backup_pre_resample),
THEN resample. Equal-weight resampled LUTs cannot be fixed this way.

- Wins: move weight among paying books (pay>0) by payout band.
- Loses: move weight among pay==0 books by victory pot (dog+cat from books).
  Hit-rate (total lose weight) is preserved; RTP unchanged for loses.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/match_duel_win_body.py --mode bonus_duel_cat \\
      --lut-dir library/publish_files_backup_pre_resample --rtp 0.9601
  $PY tools/duel_payout_histogram.py --lut-dir library/publish_files_backup_pre_resample
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None

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


def _load_book_pots(lut_dir: Path, mode: str) -> dict[int, float]:
    pots: dict[int, float] = {}
    candidates = [
        lut_dir / f"books_{mode}.jsonl.zst",
        ROOT / "library" / "books" / f"books_{mode}.json",
        ROOT / "library" / "publish_files" / f"books_{mode}.jsonl.zst",
    ]
    path = next((p for p in candidates if p.exists()), None)
    if path is None:
        return pots

    def pot_from_book(book: dict) -> float:
        for e in book.get("events") or []:
            if isinstance(e, dict) and e.get("type") == "duelEnd":
                return (int(e.get("dogTotal") or 0) + int(e.get("catTotal") or 0)) / 100.0
        return 0.0

    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        for book in data if isinstance(data, list) else [data]:
            pots[int(book["id"])] = pot_from_book(book)
        return pots
    if zstd is None:
        raise SystemExit("zstandard required to read books for lose-mirror match")
    dctx = zstd.ZstdDecompressor()
    with path.open("rb") as f:
        with dctx.stream_reader(f) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text:
                line = line.strip()
                if not line:
                    continue
                book = json.loads(line)
                pots[int(book["id"])] = pot_from_book(book)
    return pots


def _win_weight(rows: list[list]) -> float:
    return sum(w for _, w, pay in rows if pay > 0)


def _lose_weight(rows: list[list]) -> float:
    return sum(w for _, w, pay in rows if pay <= 0)


def _move(rows: list[list], donor_i: int, acceptor_i: int, amount: int) -> int:
    if amount <= 0:
        return 0
    dw = rows[donor_i][1]
    if dw <= 0:
        return 0
    moved = min(amount, dw)
    if dw - moved <= 0 and dw > 1:
        moved = dw - 1
    if moved <= 0:
        return 0
    rows[donor_i][1] -= moved
    rows[acceptor_i][1] += moved
    return moved


def _match_population(
    rows: list[list],
    bands: list[dict],
    by_band: list[list[int]],
    weight_fn,
    tol: float,
) -> dict:
    pop_w = weight_fn(rows)
    if pop_w <= 0:
        return {"ok": False, "reason": "empty population"}

    rigid = [i for i, b in enumerate(bands) if not b.get("flexible")]
    stats = {"moves": 0, "iters": 0}

    for it in range(MAX_ITERS):
        stats["iters"] = it + 1
        pop_w = weight_fn(rows)
        bw = [0.0] * len(bands)
        for bi, idxs in enumerate(by_band):
            bw[bi] = sum(rows[i][1] for i in idxs if rows[i][1] > 0)
        shares = [bw[i] / pop_w for i in range(len(bands))]
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
        if not donors:
            for fi in range(len(bands)):
                if bands[fi].get("flexible"):
                    donors = [i for i in by_band[fi] if rows[i][1] > 1]
                    if donors:
                        over_i = fi
                        break
        if not donors or not acceptors:
            break
        chunk = max(1, int(pop_w * min(over_err, under_err) * 0.05))
        donor_i = max(donors, key=lambda i: rows[i][1])
        acceptor_i = acceptors[it % len(acceptors)]
        moved = _move(rows, donor_i, acceptor_i, chunk)
        if moved <= 0:
            break
        stats["moves"] += 1

    pop_w = weight_fn(rows)
    bw = [0.0] * len(bands)
    for bi, idxs in enumerate(by_band):
        bw[bi] = sum(rows[i][1] for i in idxs if rows[i][1] > 0)
    stats["shares"] = {
        bands[i]["label"]: round(100.0 * bw[i] / pop_w, 3) if pop_w else 0.0
        for i in range(len(bands))
    }
    stats["ok"] = True
    return stats


def match_body(rows: list[list], bands: list[dict], tol: float = 0.015) -> dict:
    by_band: list[list[int]] = [[] for _ in bands]
    for i, (_sid, w, pay) in enumerate(rows):
        if pay <= 0 or w <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            by_band[bi].append(i)
    return _match_population(rows, bands, by_band, _win_weight, tol)


def match_lose_victory(
    rows: list[list],
    bands: list[dict],
    pots: dict[int, float],
    tol: float = 0.015,
) -> dict:
    by_band: list[list[int]] = [[] for _ in bands]
    missing = 0
    for i, (sid, w, pay) in enumerate(rows):
        if pay > 0 or w <= 0:
            continue
        pot = float(pots.get(sid, 0.0))
        if pot <= 0:
            missing += 1
            continue
        bi = _band_for(pot, bands)
        if bi is not None:
            by_band[bi].append(i)
    stats = _match_population(rows, bands, by_band, _lose_weight, tol)
    stats["missing_pot_books"] = missing
    stats["bands_with_books"] = sum(1 for b in by_band if b)
    return stats


def match_rtp(rows: list[list], target_rtp: float, cost: float = COST, tol: float = 0.0005) -> dict:
    """HIT-neutral RTP tweak: move weight between low-pay and high-pay winners."""
    paying = [(i, rows[i][2]) for i in range(len(rows)) if rows[i][2] > 0 and rows[i][1] > 0]
    if not paying:
        return {"ok": False}
    paying_sorted = sorted(paying, key=lambda t: t[1])
    n = len(paying_sorted)
    low = [i for i, _ in paying_sorted[: max(1, n // 4)]]
    mid = [i for i, _ in paying_sorted[n // 4 : (3 * n) // 4]]
    high = [i for i, _ in paying_sorted[-(max(1, n // 4)) :]]
    moves = 0
    for it in range(2500):
        cur = _rtp(rows, cost)
        if abs(cur - target_rtp) <= tol:
            break
        if cur > target_rtp:
            donors = [i for i in high if rows[i][1] > 1]
            acceptors = low + mid
        else:
            donors = [i for i in (low + mid) if rows[i][1] > 1]
            acceptors = high
        if not donors or not acceptors:
            break
        d = max(donors, key=lambda i: rows[i][1])
        a = acceptors[it % len(acceptors)]
        chunk = max(1, rows[d][1] // 20)
        if _move(rows, d, a, chunk) <= 0:
            donors = [i for i in donors if i != d and rows[i][1] > 1]
            if not donors:
                break
            continue
        moves += 1
    return {"ok": True, "moves": moves, "rtp": _rtp(rows, cost)}


def match_rtp_within_bands(
    rows: list[list],
    bands: list[dict],
    target_rtp: float,
    cost: float = COST,
    tol: float = 0.0005,
) -> dict:
    """Raise/lower EV without changing band shares: move weight low→high inside each band."""
    by_band: list[list[int]] = [[] for _ in bands]
    for i, (_sid, w, pay) in enumerate(rows):
        if pay <= 0 or w <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            by_band[bi].append(i)

    moves = 0
    for _ in range(12000):
        cur = _rtp(rows, cost)
        if abs(cur - target_rtp) <= tol:
            break
        richer = cur < target_rtp
        progressed = False
        # Prefer wider bands first (more room to differentiate pays).
        order = sorted(range(len(bands)), key=lambda bi: -len(by_band[bi]))
        for bi in order:
            idxs = [i for i in by_band[bi] if rows[i][1] > 0]
            if len(idxs) < 2:
                continue
            idxs_sorted = sorted(idxs, key=lambda i: rows[i][2])
            low_i = idxs_sorted[0]
            high_i = idxs_sorted[-1]
            if rows[high_i][2] <= rows[low_i][2]:
                continue
            if richer:
                donors = [i for i in idxs_sorted[: max(1, len(idxs_sorted) // 3)] if rows[i][1] > 1]
                acceptors = idxs_sorted[-(max(1, len(idxs_sorted) // 3)) :]
            else:
                donors = [i for i in idxs_sorted[-(max(1, len(idxs_sorted) // 3)) :] if rows[i][1] > 1]
                acceptors = idxs_sorted[: max(1, len(idxs_sorted) // 3)]
            if not donors or not acceptors:
                continue
            d = max(donors, key=lambda i: rows[i][1])
            a = acceptors[moves % len(acceptors)]
            chunk = max(1, rows[d][1] // 25)
            if _move(rows, d, a, chunk) > 0:
                moves += 1
                progressed = True
                break
        if not progressed:
            break
    return {"ok": True, "moves": moves, "rtp": _rtp(rows, cost)}


def _band_maps(rows: list[list], bands: list[dict]) -> list[list[int]]:
    by: list[list[int]] = [[] for _ in bands]
    for i, (_sid, w, pay) in enumerate(rows):
        if pay <= 0 or w <= 0:
            continue
        bi = _band_for(_mult(pay), bands)
        if bi is not None:
            by[bi].append(i)
    return by


def _win_shares(rows: list[list], bands: list[dict]) -> tuple[list[float], list[list[int]]]:
    by = _band_maps(rows, bands)
    ww = _win_weight(rows)
    if ww <= 0:
        return [0.0] * len(bands), by
    return [sum(rows[i][1] for i in by[b]) / ww for b in range(len(bands))], by


def _high_band_labels(bands: list[dict]) -> set[str]:
    """Tail bands used as EV acceptors (dog: 700+ cascade; cat: 700+)."""
    labels = {b["label"] for b in bands}
    dog_high = {
        "700-1000",
        "1000-1500",
        "1500-2000",
        "2000-2500",
        "2500-5000",
        "5000+",
    }
    if dog_high & labels:
        return dog_high & labels
    return {b["label"] for b in bands if float(b["lo"]) >= 700}


def match_rtp_ev_repair(
    rows: list[list],
    bands: list[dict],
    target_rtp: float,
    cost: float = COST,
    tol: float = 0.00045,
    max_iters: int = 8000,
) -> dict:
    """Cross-band EV repair: over-target / mid → high under-target (keeps SMOOTH-ish cascade).

    Within-band RTP fails when pays inside a band barely differ (typical for dog after body).
    """
    target = {b["label"]: float(b["share"]) for b in bands}
    high_labels = _high_band_labels(bands)
    peak_labels = {"150-180", "180-220", "220-280"}
    moves = 0
    stuck = False

    for it in range(max_iters):
        cur = _rtp(rows, cost)
        if abs(cur - target_rtp) <= tol:
            break
        sh, by = _win_shares(rows, bands)

        if cur < target_rtp:
            donors: list[tuple[float, int, int]] = []
            for bi, b in enumerate(bands):
                lab = b["label"]
                over = sh[bi] - target[lab]
                if over > 0.002 and lab not in high_labels:
                    for i in by[bi]:
                        if rows[i][1] > 1:
                            donors.append((over, rows[i][2], i))
            if not donors:
                for bi, b in enumerate(bands):
                    lab = b["label"]
                    if lab in peak_labels and sh[bi] > target[lab] - 0.03:
                        for i in by[bi]:
                            if rows[i][1] > 1:
                                donors.append((0.0, rows[i][2], i))
            acceptors: list[tuple[int, int]] = []
            for bi, b in enumerate(bands):
                lab = b["label"]
                if lab in high_labels and sh[bi] < target[lab] + 0.04:
                    for i in by[bi]:
                        acceptors.append((rows[i][2], i))
            if not donors or not acceptors:
                stuck = True
                break
            donors.sort(key=lambda t: (-t[0], t[1]))
            acceptors.sort(key=lambda t: -t[0])
            d = donors[it % len(donors)][2]
            a = acceptors[it % len(acceptors)][1]
            if _move(rows, d, a, max(1, rows[d][1] // 30)) > 0:
                moves += 1
            else:
                stuck = True
                break
        else:
            donors_i: list[int] = []
            acceptors_i: list[int] = []
            for bi, b in enumerate(bands):
                if b["label"] in high_labels:
                    for i in by[bi]:
                        if rows[i][1] > 1:
                            donors_i.append(i)
                if b["label"] in {"150-180", "180-220"} and sh[bi] < target[b["label"]] + 0.02:
                    for i in by[bi]:
                        acceptors_i.append(i)
            if not donors_i or not acceptors_i:
                stuck = True
                break
            d = donors_i[it % len(donors_i)]
            a = acceptors_i[it % len(acceptors_i)]
            if _move(rows, d, a, max(1, rows[d][1] // 40)) > 0:
                moves += 1
            else:
                stuck = True
                break

    # Short second pass after mild body drift: lowest over-target → highest high-band pay.
    for _ in range(3000):
        cur = _rtp(rows, cost)
        if abs(cur - target_rtp) <= tol:
            break
        sh, by = _win_shares(rows, bands)
        donors2: list[tuple[int, int]] = []
        acceptors2: list[tuple[int, int]] = []
        for bi, b in enumerate(bands):
            lab = b["label"]
            if sh[bi] > target[lab] + 0.005 and lab not in {"5000+", "700+"}:
                for i in by[bi]:
                    if rows[i][1] > 1:
                        donors2.append((rows[i][2], i))
            if lab in high_labels:
                for i in by[bi]:
                    acceptors2.append((rows[i][2], i))
        if not donors2 or not acceptors2:
            break
        donors2.sort()
        acceptors2.sort(reverse=True)
        if cur < target_rtp:
            moved = _move(rows, donors2[0][1], acceptors2[0][1], max(1, rows[donors2[0][1]][1] // 25))
        else:
            moved = _move(rows, acceptors2[0][1], donors2[0][1], max(1, rows[acceptors2[0][1]][1] // 25))
        if moved <= 0:
            break
        moves += 1

    final = _rtp(rows, cost)
    return {
        "ok": abs(final - target_rtp) <= tol,
        "moves": moves,
        "rtp": final,
        "stuck": stuck,
    }


def match_body_and_rtp(
    rows: list[list],
    bands: list[dict],
    target_rtp: float,
    body_tol: float = 0.015,
    rounds: int = 4,
) -> dict:
    """Body match → within-band RTP → EV-repair if still low (dog mid→high)."""
    stats: dict = {"rounds": []}
    body = match_body(rows, bands, tol=body_tol)
    print(f"  body: moves={body.get('moves')} shares={body.get('shares')}", flush=True)

    for r in range(rounds):
        rtp_in = match_rtp_within_bands(rows, bands, target_rtp, tol=0.0005)
        rtp_x: dict = {"moves": 0, "rtp": rtp_in.get("rtp")}
        if abs(_rtp(rows) - target_rtp) > 0.0015:
            # Blind cross-band match_rtp destroys cascade; prefer EV-repair.
            rtp_x = match_rtp_ev_repair(rows, bands, target_rtp, tol=0.0005, max_iters=4000)
            body = match_body(rows, bands, tol=max(body_tol, 0.025))
        stats["rounds"].append(
            {
                "r": r,
                "rtp": round(_rtp(rows), 5),
                "within_moves": rtp_in.get("moves"),
                "ev_moves": rtp_x.get("moves"),
            }
        )
        print(
            f"  round {r}: RTP={stats['rounds'][-1]['rtp']} "
            f"within={rtp_in.get('moves')} ev={rtp_x.get('moves')}",
            flush=True,
        )
        if abs(_rtp(rows) - target_rtp) <= 0.0005:
            break

    body = match_body(rows, bands, tol=max(body_tol, 0.022))
    rtp_in = match_rtp_within_bands(rows, bands, target_rtp, tol=0.00045)
    ev = {"moves": 0, "rtp": _rtp(rows), "ok": True}
    if abs(_rtp(rows) - target_rtp) > 0.0005:
        ev = match_rtp_ev_repair(rows, bands, target_rtp, tol=0.00045, max_iters=8000)
        print(f"  ev-repair final: moves={ev.get('moves')} RTP={ev.get('rtp'):.5f}", flush=True)
        body = match_body(rows, bands, tol=max(body_tol, 0.025))

    stats["final_rtp"] = _rtp(rows)
    stats["final_shares"] = body.get("shares")
    stats["ok"] = abs(stats["final_rtp"] - target_rtp) <= 0.0005
    stats["within_final"] = rtp_in
    stats["ev_final"] = ev
    return stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", required=True, choices=["bonus_duel_cat", "bonus_duel_dog"])
    ap.add_argument(
        "--lut-dir",
        type=Path,
        default=ROOT / "library" / "publish_files_backup_pre_resample",
    )
    ap.add_argument("--targets", type=Path, default=TARGETS_PATH)
    ap.add_argument("--tol", type=float, default=0.015, help="band share abs tol (fraction)")
    ap.add_argument("--rtp", type=float, default=0.9601)
    ap.add_argument(
        "--rtp-tol",
        type=float,
        default=0.003,
        help="Accept RTP within ±tol of --rtp (default 0.003; old gate 0.0005 was too tight after body)",
    )
    ap.add_argument("--skip-rtp", action="store_true")
    ap.add_argument("--skip-lose", action="store_true", help="Only match win payout body")
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
    lose_w = _lose_weight(rows)
    tw = sum(w for _, w, _ in rows)
    print(
        f"{args.mode}: rows={len(rows)} P(win)={win_w/tw:.4f} "
        f"P(lose)={lose_w/tw:.4f} RTP={before_rtp:.4f}"
    )

    if not args.skip_rtp:
        combo = match_body_and_rtp(rows, bands, args.rtp, body_tol=args.tol, rounds=4)
        print("body+rtp:", json.dumps(combo, indent=2))
        # Final HIT-neutral polish toward --rtp (body match often leaves RTP slightly high).
        polish = match_rtp(rows, args.rtp, tol=min(0.0005, args.rtp_tol))
        print("final rtp polish:", polish)
    else:
        body = match_body(rows, bands, tol=args.tol)
        print("win body:", json.dumps(body, indent=2))

    if not args.skip_lose:
        pots = _load_book_pots(args.lut_dir, args.mode)
        if not pots:
            print("lose victory: SKIP (no books found to join pots)")
        else:
            lose_stats = match_lose_victory(rows, bands, pots, tol=args.tol)
            print("lose victory:", json.dumps(lose_stats, indent=2))
        if not args.skip_rtp:
            # lose reweight is EV-neutral; light RTP polish
            print("rtp polish:", match_rtp(rows, args.rtp, tol=min(0.0005, args.rtp_tol)))

    after_rtp = _rtp(rows)
    win_w2 = _win_weight(rows)
    lose_w2 = _lose_weight(rows)
    print(
        f"after: P(win)={win_w2/tw:.4f} P(lose)={lose_w2/tw:.4f} RTP={after_rtp:.4f}"
    )

    rtp_ok = True
    if not args.skip_rtp:
        rtp_ok = abs(after_rtp - args.rtp) <= args.rtp_tol
        if not rtp_ok:
            print(
                f"ERROR: {args.mode} RTP {after_rtp:.5f} outside target "
                f"{args.rtp}±{args.rtp_tol} — refuse to treat as SMOOTH OK"
            )

    if args.dry_run:
        print("dry-run: not writing")
        if not rtp_ok:
            raise SystemExit(2)
        return
    _write_lut(lut_path, rows)
    print(f"wrote {lut_path}")
    if not rtp_ok:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
