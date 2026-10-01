"""Reweight duel LUT toward competition TARGET (close/medium/blowout + banks).

Does NOT rewrite boards/wins/banks inside books — only LUT weights.

Targets (canvas):
  Finish among wins AND loses: Close 30% / Medium 45% / Blowout 25%
  Bands: gap/pot ≤20% / 20–50% / >50%
  Banks: cat win 277 vs 180, lose 180 vs 277; dog 564↔350
  Hit-rate preserved. Direct weight assignment (no slow move loops).

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/match_duel_competition.py --mode bonus_duel_cat --lut-dir library/publish_files
  $PY tools/match_duel_competition.py --mode bonus_duel_dog --lut-dir library/publish_files
"""

from __future__ import annotations

import argparse
import io
import json
import math
from pathlib import Path

try:
    import zstandard as zstd
except ImportError:  # noqa: BLE001
    zstd = None

from duel_intrigue import finish_band
from duel_competition import (
    lead_then_lose_target,
    mode_bank_targets,
    share_targets,
)

ROOT = Path(__file__).resolve().parents[1]
COST = 150.0
BANDS = ("CLOSE", "MEDIUM", "BLOWOUT")
WEIGHT_SCALE = 1_000_000  # integer mass for precise shares


def _share_target() -> dict[str, float]:
    return share_targets()


def _bank_targets_map() -> dict[str, dict[str, tuple[float, float]]]:
    return {
        "bonus_duel_cat": mode_bank_targets("bonus_duel_cat"),
        "bonus_duel_dog": mode_bank_targets("bonus_duel_dog"),
    }


LEAD_THEN_LOSE_OF_LOSES = lead_then_lose_target()
BANK_TARGETS = _bank_targets_map()
SHARE_TARGET = _share_target()


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


def _rtp(rows: list[list], cost: float = COST) -> float:
    tw = sum(w for _, w, _ in rows)
    if tw <= 0:
        return 0.0
    return (sum(w * pay for _, w, pay in rows) / tw / 100.0) / cost


def _iter_books(path: Path):
    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        for book in data if isinstance(data, list) else [data]:
            yield book
        return
    if zstd is None:
        raise SystemExit("zstandard required")
    dctx = zstd.ZstdDecompressor()
    with path.open("rb") as f:
        with dctx.stream_reader(f) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text:
                if line.strip():
                    yield json.loads(line)


def _player_ahead(cat_c: int, dog_c: int, side: str) -> bool:
    return (cat_c > dog_c) if side == "cat" else (dog_c > cat_c)


def _book_meta(book: dict, mode: str) -> dict | None:
    events = book.get("events") or []
    end = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelEnd"), None)
    start = next((e for e in events if isinstance(e, dict) and e.get("type") == "duelStart"), None)
    if end is None:
        return None
    dog = int(end.get("dogTotal") or 0) / 100.0
    cat = int(end.get("catTotal") or 0) / 100.0
    pot = dog + cat
    side = str(
        end.get("playerSide")
        or (start or {}).get("playerSide")
        or ("cat" if "cat" in mode else "dog")
    )
    won = end.get("playerWon")
    if won is None:
        won = end.get("winner") == side
    else:
        won = bool(won)
    p_bank = cat if side == "cat" else dog
    o_bank = dog if side == "cat" else cat
    gap_frac = (abs(dog - cat) / pot) if pot > 0 else 0.0
    lead = False
    if not won:
        pts = [
            (int(e.get("catTotal") or 0), int(e.get("dogTotal") or 0))
            for e in events
            if isinstance(e, dict) and e.get("type") == "duelBankUpdate"
        ]
        for c, d in pts[:-1]:
            if _player_ahead(c, d, side):
                lead = True
                break
    return {
        "id": int(book["id"]),
        "won": won,
        "band": finish_band(gap_frac),
        "player": p_bank,
        "opp": o_bank,
        "lead_then_lose": lead,
    }


def _load_meta(lut_dir: Path, mode: str) -> dict[int, dict]:
    path = lut_dir / f"books_{mode}.jsonl.zst"
    if not path.exists():
        path = ROOT / "library" / "publish_files" / f"books_{mode}.jsonl.zst"
    out: dict[int, dict] = {}
    for book in _iter_books(path):
        m = _book_meta(book, mode)
        if m:
            out[m["id"]] = m
    return out


def _bank_score(player: float, opp: float, tp: float, to: float) -> float:
    def rel(a: float, t: float) -> float:
        scale = max(20.0, abs(t) * 0.5)
        return ((a - t) / scale) ** 2

    return math.exp(-0.5 * (rel(player, tp) + rel(opp, to)))


def _normalize_shares(available: dict[str, bool]) -> dict[str, float]:
    """If a band has no books, fold its target into others proportionally."""
    alive = [b for b in BANDS if available.get(b)]
    if not alive:
        return {b: 0.0 for b in BANDS}
    raw = {b: SHARE_TARGET[b] for b in alive}
    s = sum(raw.values())
    out = {b: 0.0 for b in BANDS}
    for b in alive:
        out[b] = raw[b] / s
    return out


def _distribute(total: int, scores: list[float]) -> list[int]:
    """Integer weights summing to total, proportional to scores (min 1 if total>=n)."""
    n = len(scores)
    if n == 0 or total <= 0:
        return []
    if total < n:
        # Too little mass — give 1 to top-scoring, 0 to rest (avoid for our scale)
        order = sorted(range(n), key=lambda i: -scores[i])
        out = [0] * n
        for k in range(total):
            out[order[k]] = 1
        return out
    ssum = sum(scores) or float(n)
    raw = [total * (s / ssum) for s in scores]
    ints = [max(1, int(math.floor(x))) for x in raw]
    drift = total - sum(ints)
    # Give remainder to highest fractional parts
    frac = sorted(range(n), key=lambda i: -(raw[i] - math.floor(raw[i])))
    k = 0
    while drift > 0:
        ints[frac[k % n]] += 1
        drift -= 1
        k += 1
    while drift < 0:
        j = frac[k % n]
        if ints[j] > 1:
            ints[j] -= 1
            drift += 1
        k += 1
        if k > n * 10:
            break
    return ints


def _rtp_repair_within_win_bands(
    rows: list[list],
    win_idxs: list[int],
    meta: dict[int, dict],
    target_rtp: float,
    tol: float = 0.002,
    max_iters: int = 20000,
) -> int:
    """Move win weight high↔low pay inside the same finish band to restore RTP."""
    by_band: dict[str, list[int]] = {b: [] for b in BANDS}
    for i in win_idxs:
        m = meta.get(rows[i][0])
        if m and rows[i][1] > 0:
            by_band[m["band"]].append(i)

    moves = 0
    for _ in range(max_iters):
        cur = _rtp(rows)
        if abs(cur - target_rtp) <= tol:
            break
        progressed = False
        for band, members in by_band.items():
            if len(members) < 2:
                continue
            rich = sorted(members, key=lambda i: rows[i][2])
            if cur > target_rtp:
                donors = [i for i in rich[len(rich) // 2 :] if rows[i][1] > 1]
                acceptors = rich[: max(1, len(rich) // 2)]
            else:
                donors = [i for i in rich[: max(1, len(rich) // 2)] if rows[i][1] > 1]
                acceptors = rich[len(rich) // 2 :]
            if not donors or not acceptors:
                continue
            d = max(donors, key=lambda i: rows[i][1])
            a = acceptors[moves % len(acceptors)]
            chunk = max(1, rows[d][1] // 15)
            amount = min(chunk, rows[d][1] - 1)
            if amount <= 0:
                continue
            rows[d][1] -= amount
            rows[a][1] += amount
            moves += 1
            progressed = True
            break
        if not progressed:
            break
    return moves


def _assign_group(
    rows: list[list],
    members: list[int],
    meta: dict[int, dict],
    group_total: int,
    tp: float,
    to: float,
    *,
    lead_target: float | None = None,
) -> None:
    """Assign weights for win-only or lose-only member indices."""
    by_band: dict[str, list[int]] = {b: [] for b in BANDS}
    for i in members:
        sid = rows[i][0]
        m = meta.get(sid)
        if m:
            by_band[m["band"]].append(i)

    shares = _normalize_shares({b: bool(by_band[b]) for b in BANDS})
    band_mass = {b: int(round(group_total * shares[b])) for b in BANDS}
    drift = group_total - sum(band_mass.values())
    prefer = max(BANDS, key=lambda b: shares[b])
    band_mass[prefer] = max(0, band_mass[prefer] + drift)

    for band in BANDS:
        idxs = by_band[band]
        mass = band_mass[band]
        if not idxs or mass <= 0:
            for i in idxs:
                rows[i][1] = 0
            continue
        scores = [
            _bank_score(meta[rows[i][0]]["player"], meta[rows[i][0]]["opp"], tp, to)
            for i in idxs
        ]
        if lead_target is not None:
            for j, i in enumerate(idxs):
                if meta[rows[i][0]]["lead_then_lose"]:
                    scores[j] *= 1.35
        weights = _distribute(mass, scores)
        for i, w in zip(idxs, weights):
            rows[i][1] = max(0, int(w))


def _report(rows: list[list], meta: dict[int, dict], mode: str) -> dict:
    tw = sum(w for _, w, _ in rows)
    win_w = sum(w for _, w, p in rows if p > 0)
    lose_w = tw - win_w

    def band_pct(won: bool) -> dict[str, float]:
        by = {b: 0.0 for b in BANDS}
        tot = 0.0
        for sid, w, _ in rows:
            m = meta.get(sid)
            if not m or m["won"] != won or w <= 0:
                continue
            by[m["band"]] += w
            tot += w
        if tot <= 0:
            return {b: 0.0 for b in BANDS}
        return {b: round(100 * by[b] / tot, 2) for b in BANDS}

    def means(won: bool) -> tuple[float, float]:
        sp = so = sw = 0.0
        for sid, w, _ in rows:
            m = meta.get(sid)
            if not m or m["won"] != won or w <= 0:
                continue
            sp += m["player"] * w
            so += m["opp"] * w
            sw += w
        if sw <= 0:
            return 0.0, 0.0
        return round(sp / sw, 1), round(so / sw, 1)

    lead_w = sum(
        w for sid, w, p in rows if p <= 0 and meta.get(sid, {}).get("lead_then_lose")
    )
    return {
        "mode": mode,
        "rtp": round(_rtp(rows), 4),
        "hit_win_pct": round(100 * win_w / tw, 2) if tw else 0,
        "win_bands_pct": band_pct(True),
        "lose_bands_pct": band_pct(False),
        "win_banks": means(True),
        "lose_banks": means(False),
        "lead_then_lose_of_loses_pct": round(100 * lead_w / lose_w, 2) if lose_w else 0,
    }


def run(mode: str, lut_dir: Path) -> dict:
    lut_path = lut_dir / f"lookUpTable_{mode}_0.csv"
    if not lut_path.exists():
        raise SystemExit(f"missing LUT {lut_path}")
    print(f"loading LUT {lut_path.name}...", flush=True)
    rows = _load_lut(lut_path)
    print(f"loading books meta for {mode}...", flush=True)
    meta = _load_meta(lut_dir, mode)
    print(f"meta books={len(meta)}", flush=True)

    id_to_i = {sid: i for i, (sid, _, _) in enumerate(rows)}
    win_idxs = []
    lose_idxs = []
    for sid, i in id_to_i.items():
        m = meta.get(sid)
        if not m:
            rows[i][1] = 0
            continue
        if m["won"]:
            win_idxs.append(i)
        else:
            lose_idxs.append(i)

    # Preserve hit-rate from original pays (equal or weighted)
    tw0 = sum(max(1, w) for _, w, _ in rows)  # before zeroing missing
    # Recompute from pay flags with prior weights
    rows_prev = _load_lut(lut_path)
    tw_prev = sum(w for _, w, _ in rows_prev) or len(rows_prev)
    ww_prev = sum(w for _, w, p in rows_prev if p > 0)
    hit = ww_prev / tw_prev if tw_prev else 0.5

    win_total = int(round(WEIGHT_SCALE * hit))
    lose_total = WEIGHT_SCALE - win_total
    bt = BANK_TARGETS[mode]

    print(f"assign wins mass={win_total} loses={lose_total} hit={hit:.3f}", flush=True)
    rtp0 = _rtp(rows_prev)
    _assign_group(rows, win_idxs, meta, win_total, *bt["win"], lead_target=None)
    _assign_group(
        rows,
        lose_idxs,
        meta,
        lose_total,
        *bt["lose"],
        lead_target=LEAD_THEN_LOSE_OF_LOSES,
    )

    for i, (sid, w, _) in enumerate(rows):
        if sid not in meta:
            rows[i][1] = 0

    rtp_moves = _rtp_repair_within_win_bands(rows, win_idxs, meta, rtp0)
    print(f"rtp repair moves={rtp_moves} rtp0={rtp0:.4f} now={_rtp(rows):.4f}", flush=True)

    _write_lut(lut_path, rows)
    rep = _report(rows, meta, mode)
    rep["rtp0"] = round(rtp0, 4)
    rep["targets"] = {
        "shares": SHARE_TARGET,
        "banks": bt,
        "lead_then_lose_of_loses": LEAD_THEN_LOSE_OF_LOSES,
    }
    # Achievable note for banks
    rep["note"] = (
        "Bank means are soft — limited by books that exist in each finish band. "
        "Lose competitive banks need natural close/medium loses in the pool."
    )
    return rep


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", required=True, choices=sorted(BANK_TARGETS))
    ap.add_argument("--lut-dir", type=Path, default=ROOT / "library" / "publish_files")
    args = ap.parse_args()
    rep = run(args.mode, args.lut_dir)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()
