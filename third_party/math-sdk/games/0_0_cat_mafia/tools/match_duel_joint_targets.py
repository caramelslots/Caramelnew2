"""Joint duel LUT reweight: SMOOTH · VH + Intrigue finish/banks + RTP.

Unlike sequential §3b→§3c (where competition overwrote the win body and
could sink dog RTP), this assigns **nested** win mass:

  hit-rate preserved
  → finish Close/Medium/Blowout 30/45/25
  → within each finish band, SMOOTH payout-band shares
  → within each payout band, soft bank-score (player|opp TARGET)
  → loses: finish shares + bank score + lead_then_lose soft boost
  → RTP polish to --rtp (default 0.9601), prefer within finish band

Run on the **weighted** LUT (publish_files_backup_pre_resample), then resample.

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/match_duel_joint_targets.py --mode bonus_duel_dog \\
      --lut-dir library/publish_files_backup_pre_resample
  $PY tools/match_duel_joint_targets.py --mode bonus_duel_cat \\
      --lut-dir library/publish_files_backup_pre_resample
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from match_duel_competition import (
    BANDS,
    BANK_TARGETS,
    COST,
    LEAD_THEN_LOSE_OF_LOSES,
    SHARE_TARGET,
    WEIGHT_SCALE,
    _assign_group,
    _bank_score,
    _distribute,
    _load_lut,
    _load_meta,
    _normalize_shares,
    _report,
    _rtp,
    _rtp_repair_within_win_bands,
    _write_lut,
)
from match_duel_win_body import _band_for, _mult, match_rtp

ROOT = Path(__file__).resolve().parents[1]
SMOOTH_PATH = Path(__file__).resolve().parent / "duel_smooth_vh_targets.json"
TARGET_RTP = 0.9601


def _load_smooth(mode: str) -> list[dict]:
    raw = json.loads(SMOOTH_PATH.read_text(encoding="utf-8"))
    if mode not in raw:
        raise SystemExit(f"no SMOOTH targets for {mode}")
    return list(raw[mode]["bands"])


def _normalize_band_shares(bands: list[dict], available: list[bool]) -> list[float]:
    """Fold missing payout-band targets into available rigid bands."""
    alive = [i for i, ok in enumerate(available) if ok and not bands[i].get("flexible")]
    flex = [i for i, ok in enumerate(available) if ok and bands[i].get("flexible")]
    out = [0.0] * len(bands)
    if not alive and not flex:
        return out
    if not alive:
        # only flexible present
        s = 1.0 / len(flex)
        for i in flex:
            out[i] = s
        return out
    raw = {i: float(bands[i]["share"]) for i in alive}
    tot = sum(raw.values()) or 1.0
    for i, v in raw.items():
        out[i] = v / tot
    # leave flexible at 0 unless nothing else — already handled
    return out


def _assign_wins_joint(
    rows: list[list],
    win_idxs: list[int],
    meta: dict[int, dict],
    win_total: int,
    tp: float,
    to: float,
    smooth_bands: list[dict],
) -> None:
    # Zero wins first
    for i in win_idxs:
        rows[i][1] = 0

    by_finish: dict[str, list[int]] = {b: [] for b in BANDS}
    for i in win_idxs:
        m = meta.get(rows[i][0])
        if m:
            by_finish[m["band"]].append(i)

    finish_shares = _normalize_shares({b: bool(by_finish[b]) for b in BANDS})
    finish_mass = {b: int(round(win_total * finish_shares[b])) for b in BANDS}
    drift = win_total - sum(finish_mass.values())
    prefer = max(BANDS, key=lambda b: finish_shares[b])
    finish_mass[prefer] = max(0, finish_mass[prefer] + drift)

    for fband in BANDS:
        idxs = by_finish[fband]
        mass = finish_mass[fband]
        if not idxs or mass <= 0:
            continue

        by_pay: list[list[int]] = [[] for _ in smooth_bands]
        orphan: list[int] = []
        for i in idxs:
            bi = _band_for(_mult(rows[i][2]), smooth_bands)
            if bi is None:
                orphan.append(i)
            else:
                by_pay[bi].append(i)
        # Drop orphans onto nearest flexible / last band if any
        if orphan:
            flex_i = next(
                (i for i, b in enumerate(smooth_bands) if b.get("flexible")),
                len(smooth_bands) - 1,
            )
            by_pay[flex_i].extend(orphan)

        avail = [bool(by_pay[i]) for i in range(len(smooth_bands))]
        pay_shares = _normalize_band_shares(smooth_bands, avail)
        pay_mass = [int(round(mass * s)) for s in pay_shares]
        # Put remainder on largest available share
        rem = mass - sum(pay_mass)
        if rem != 0:
            j = max(range(len(pay_mass)), key=lambda k: pay_shares[k])
            pay_mass[j] = max(0, pay_mass[j] + rem)

        for bi, pay_idxs in enumerate(by_pay):
            pm = pay_mass[bi]
            if not pay_idxs:
                continue
            if pm <= 0:
                for i in pay_idxs:
                    rows[i][1] = 0
                continue
            scores = [
                _bank_score(meta[rows[i][0]]["player"], meta[rows[i][0]]["opp"], tp, to)
                for i in pay_idxs
            ]
            # Tiny floor so zero-score books can still get mass if needed
            scores = [max(1e-6, s) for s in scores]
            weights = _distribute(pm, scores)
            for i, w in zip(pay_idxs, weights):
                rows[i][1] = max(0, int(w))


def _smooth_report(rows: list[list], smooth_bands: list[dict]) -> dict[str, float]:
    ww = sum(w for _, w, p in rows if p > 0) or 1.0
    out: dict[str, float] = {}
    for b in smooth_bands:
        lo, hi = float(b["lo"]), float(b["hi"])
        label = b["label"]
        m = 0.0
        for _, w, pay in rows:
            if pay <= 0 or w <= 0:
                continue
            x = _mult(pay)
            if hi >= 25000:
                ok = x >= lo
            else:
                ok = lo <= x < hi
            if ok:
                m += w
        out[label] = round(100.0 * m / ww, 2)
    return out


def run(mode: str, lut_dir: Path, target_rtp: float, rtp_tol: float) -> dict:
    lut_path = lut_dir / f"lookUpTable_{mode}_0.csv"
    if not lut_path.exists():
        raise SystemExit(f"missing LUT {lut_path}")

    print(f"loading LUT {lut_path.name}...", flush=True)
    rows = _load_lut(lut_path)
    rows_prev = _load_lut(lut_path)
    print(f"loading books meta for {mode}...", flush=True)
    meta = _load_meta(lut_dir, mode)
    print(f"meta books={len(meta)}", flush=True)
    smooth_bands = _load_smooth(mode)

    win_idxs: list[int] = []
    lose_idxs: list[int] = []
    for i, (sid, _, _) in enumerate(rows):
        m = meta.get(sid)
        if not m:
            rows[i][1] = 0
            continue
        if m["won"]:
            win_idxs.append(i)
        else:
            lose_idxs.append(i)

    tw_prev = sum(w for _, w, _ in rows_prev) or len(rows_prev)
    ww_prev = sum(w for _, w, p in rows_prev if p > 0)
    hit = ww_prev / tw_prev if tw_prev else 0.5
    win_total = int(round(WEIGHT_SCALE * hit))
    lose_total = WEIGHT_SCALE - win_total
    bt = BANK_TARGETS[mode]

    print(
        f"joint assign wins={win_total} loses={lose_total} hit={hit:.4f} "
        f"rtp_in={_rtp(rows_prev):.4f}",
        flush=True,
    )
    _assign_wins_joint(
        rows, win_idxs, meta, win_total, *bt["win"], smooth_bands=smooth_bands
    )
    _assign_group(
        rows,
        lose_idxs,
        meta,
        lose_total,
        *bt["lose"],
        lead_target=LEAD_THEN_LOSE_OF_LOSES,
    )
    for i, (sid, _, _) in enumerate(rows):
        if sid not in meta:
            rows[i][1] = 0

    print(f"after assign rtp={_rtp(rows):.4f}", flush=True)
    moves = _rtp_repair_within_win_bands(
        rows, win_idxs, meta, target_rtp, tol=rtp_tol, max_iters=40000
    )
    print(f"within-finish rtp repair moves={moves} rtp={_rtp(rows):.4f}", flush=True)

    if abs(_rtp(rows) - target_rtp) > rtp_tol:
        polish = match_rtp(rows, target_rtp, cost=COST, tol=rtp_tol)
        print(
            f"global rtp polish moves={polish.get('moves')} rtp={_rtp(rows):.4f}",
            flush=True,
        )
        # Re-nudge finish shares if global polish drifted them a lot
        rep_tmp = _report(rows, meta, mode)
        win_pct = rep_tmp["win_bands_pct"]
        drifted = any(
            abs(win_pct.get(b, 0) / 100.0 - SHARE_TARGET[b]) > 0.04 for b in BANDS
        )
        if drifted:
            print("re-assign wins after global polish (finish drifted)", flush=True)
            _assign_wins_joint(
                rows, win_idxs, meta, win_total, *bt["win"], smooth_bands=smooth_bands
            )
            moves2 = _rtp_repair_within_win_bands(
                rows, win_idxs, meta, target_rtp, tol=rtp_tol, max_iters=40000
            )
            print(f"re-repair moves={moves2} rtp={_rtp(rows):.4f}", flush=True)
            if abs(_rtp(rows) - target_rtp) > rtp_tol:
                match_rtp(rows, target_rtp, cost=COST, tol=rtp_tol)
                print(f"final polish rtp={_rtp(rows):.4f}", flush=True)

    _write_lut(lut_path, rows)
    rep = _report(rows, meta, mode)
    rep["rtp_target"] = target_rtp
    rep["smooth_now_pct"] = _smooth_report(rows, smooth_bands)
    rep["smooth_target_pct"] = {
        b["label"]: round(100.0 * float(b["share"]), 2) for b in smooth_bands
    }
    rep["targets"] = {
        "shares": SHARE_TARGET,
        "banks": bt,
        "lead_then_lose_of_loses": LEAD_THEN_LOSE_OF_LOSES,
        "rtp": target_rtp,
    }
    ok_rtp = abs(rep["rtp"] - target_rtp) <= rtp_tol + 1e-9
    rep["rtp_ok"] = ok_rtp
    return rep


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", required=True, choices=sorted(BANK_TARGETS))
    ap.add_argument(
        "--lut-dir",
        type=Path,
        default=ROOT / "library" / "publish_files_backup_pre_resample",
    )
    ap.add_argument("--rtp", type=float, default=TARGET_RTP)
    ap.add_argument("--rtp-tol", type=float, default=0.003)
    args = ap.parse_args()
    rep = run(args.mode, args.lut_dir, args.rtp, args.rtp_tol)
    print(json.dumps(rep, indent=2))
    if not rep.get("rtp_ok"):
        raise SystemExit(
            f"RTP {rep['rtp']} outside {args.rtp}±{args.rtp_tol} for {args.mode}"
        )


if __name__ == "__main__":
    main()
