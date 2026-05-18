"""Resample optimized LUT into a self-contained books file.

Background
==========
After the optimizer assigns weights to LUT rows, our `books_<mode>.jsonl.zst`
file still contains the BIASED simulation sample (e.g. 10% forced freegame in
base mode). External tools that read books *unweighted* — dev player simulator
and Stake's verification dashboard — see the biased distribution and report
inflated RTPs (e.g. 5840% for base instead of 96%).

This script generates a NEW books file where each book appears with frequency
proportional to its production probability (from the optimizer LUT). The
resulting file is self-consistent: any consumer that picks books uniformly
will see the natural production rates.

After resample:
  - new books file: each entry roughly represents one production outcome
  - new LUT: all weights = 1 (probability is now baked into book duplication)
  - new verification.json: regenerated hashes
  - picks a seed (0..255) whose weighted resample RTP is closest to 96.01%

Usage
=====
    cd third_party/math-sdk/games/0_0_daloniil_test
    PYTHONPATH=../..:. /tmp/csmath_venv/bin/python tools/resample_books.py

Originals are NOT touched by this script — see
`library/publish_files_backup_pre_resample/` for the snapshot taken before
running. The new files are written directly to `library/publish_files/` and
`library/configs/books_*.verification.json`.
"""

from __future__ import annotations

import _pickle
import csv
import hashlib
import io
import json
import random
from pathlib import Path

import zstandard as zstd

ROOT = Path(__file__).resolve().parent.parent
PUBLISH = ROOT / "library" / "publish_files"
SOURCE = ROOT / "library" / "publish_files_backup_pre_resample"
CONFIGS = ROOT / "library" / "configs"

TARGET_COUNTS = {
    "base":          100_000,
    "bonus_boost":   100_000,
    "special_spins": 100_000,
    "bonus_normal":  100_000,
    "bonus_super":   100_000,
}

COST_MAP = {
    "base":          1,
    "bonus_boost":   2,
    "special_spins": 30,
    "bonus_normal":  100,
    "bonus_super":   200,
}

SEED = 42
TARGET_RTP = 0.9601
SEED_SEARCH_RANGE = 256


def read_lut(mode: str) -> list[tuple[int, int, int]]:
    rows: list[tuple[int, int, int]] = []
    with open(SOURCE / f"lookUpTable_{mode}_0.csv") as f:
        for r in csv.reader(f):
            try:
                sid, w, p = int(r[0]), int(r[1]), int(r[2])
                rows.append((sid, w, p))
            except (ValueError, IndexError):
                continue
    return rows


def read_books(mode: str) -> dict[int, dict]:
    books: dict[int, dict] = {}
    dctx = zstd.ZstdDecompressor()
    with open(SOURCE / f"books_{mode}.jsonl.zst", "rb") as f:
        with dctx.stream_reader(f) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8")
            for line in text:
                line = line.strip()
                if not line:
                    continue
                book = json.loads(line)
                books[int(book["id"])] = book
    return books


def choose_seed(
    sim_ids: list[int],
    weights: list[int],
    payouts_by_id: dict[int, int],
    target_n: int,
    cost: float,
) -> tuple[int, list[int], float]:
    """Pick seed whose empirical RTP is nearest TARGET_RTP (avoids forced wincap)."""
    best_seed = SEED
    best_sample: list[int] | None = None
    best_rtp = 0.0
    best_gap = float("inf")
    for seed in range(SEED_SEARCH_RANGE):
        sample = random.Random(seed).choices(sim_ids, weights=weights, k=target_n)
        rtp = sum(payouts_by_id[sid] for sid in sample) / target_n / 100 / cost
        gap = abs(rtp - TARGET_RTP)
        if gap < best_gap:
            best_gap = gap
            best_seed = seed
            best_sample = sample
            best_rtp = rtp
    assert best_sample is not None
    return best_seed, best_sample, best_rtp


def resample(mode: str, target_n: int, rng: random.Random) -> dict:
    print(f"\n{'=' * 70}")
    print(f"Resampling mode = {mode}  (target N = {target_n:,})")
    print(f"{'=' * 70}")

    lut = read_lut(mode)
    books = read_books(mode)
    print(f"  Original LUT rows : {len(lut):,}")
    print(f"  Original books    : {len(books):,}")

    lut_ids = {sid for sid, _, _ in lut}
    book_ids = set(books.keys())
    missing_books = lut_ids - book_ids
    missing_lut = book_ids - lut_ids
    if missing_books or missing_lut:
        raise SystemExit(
            f"  ERROR: LUT vs books mismatch for {mode}: "
            f"{len(missing_books)} LUT rows have no book, "
            f"{len(missing_lut)} books have no LUT row."
        )

    sim_ids = [sid for sid, _, _ in lut]
    weights = [w for _, w, _ in lut]
    payouts_by_id = {sid: p for sid, _, p in lut}
    max_payout = max(payouts_by_id.values())

    print(f"  Total weight sum  : {sum(weights):,}")
    print(f"  Max payout (cents): {max_payout:,}")

    wincap_ids = {sid for sid, p in payouts_by_id.items() if p == max_payout}
    cost = COST_MAP[mode]
    seed_used, sampled_ids, pre_rtp = choose_seed(
        sim_ids, weights, payouts_by_id, target_n, cost
    )
    wincap_in_sample = sum(1 for sid in sampled_ids if sid in wincap_ids)
    if seed_used != SEED:
        print(f"  Chosen seed {seed_used} (default {SEED}) | pre-write RTP {pre_rtp:.6f}")
    else:
        print(f"  Chosen seed {seed_used} | pre-write RTP {pre_rtp:.6f}")

    fs_ids = {
        sid for sid in sim_ids
        if books[sid].get("criteria") == "freegame"
        or books[sid].get("freeGameWins", 0) > 0
    }
    fs_in_sample = sum(1 for sid in sampled_ids if sid in fs_ids)

    raw_payout_sum = sum(payouts_by_id[sid] for sid in sampled_ids)
    rtp_normalized = raw_payout_sum / len(sampled_ids) / 100 / cost
    avg_payout_in_units = raw_payout_sum / len(sampled_ids) / 100

    print(f"  Empirical RTP     : {rtp_normalized:.6f}  (target 0.9601, cost={cost})")
    print(f"  Avg payout per spin: ×{avg_payout_in_units:.4f} bet")
    print(f"  FS books in output : {fs_in_sample:,} ({fs_in_sample / target_n * 100:.4f}%)")
    print(f"  Wincap books       : {wincap_in_sample:,}")

    out_books_path = PUBLISH / f"books_{mode}.jsonl.zst"
    cctx = zstd.ZstdCompressor()
    payout_ints: list[int] = []
    with open(out_books_path, "wb") as f:
        with cctx.stream_writer(f, closefd=False) as writer:
            buf = io.StringIO()
            for new_id, orig_id in enumerate(sampled_ids, start=0):
                book = dict(books[orig_id])
                book["id"] = new_id
                buf.write(json.dumps(book, separators=(",", ":")))
                buf.write("\n")
                payout_ints.append(int(book["payoutMultiplier"]))
                if buf.tell() > 1_000_000:
                    writer.write(buf.getvalue().encode("utf-8"))
                    buf = io.StringIO()
            if buf.tell() > 0:
                writer.write(buf.getvalue().encode("utf-8"))
    new_size = out_books_path.stat().st_size
    print(f"  Wrote books        : {out_books_path.name}  ({new_size / 1024 / 1024:.1f} MB)")

    lut_path = PUBLISH / f"lookUpTable_{mode}_0.csv"
    with open(lut_path, "w") as f:
        for new_id, orig_id in enumerate(sampled_ids, start=0):
            payout = payouts_by_id[orig_id]
            f.write(f"{new_id},1,{payout}\n")
    print(f"  Wrote LUT (w=1 ea) : {lut_path.name}")

    file_bytes = out_books_path.read_bytes()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    payout_hash = hashlib.md5(_pickle.dumps(payout_ints)).hexdigest()

    verification = {
        "payout_hash": payout_hash,
        "file_hash": file_hash,
        "num_entries": len(sampled_ids),
    }
    ver_path = CONFIGS / f"books_{mode}.verification.json"
    with open(ver_path, "w") as f:
        json.dump(verification, f, indent=2)
    print(f"  Wrote verification : {ver_path.name}")

    return {
        "mode": mode,
        "target_n": target_n,
        "fs_pct": fs_in_sample / target_n * 100,
        "wincap_count": wincap_in_sample,
        "empirical_rtp": rtp_normalized,
        "size_mb": new_size / 1024 / 1024,
    }


def main():
    if not SOURCE.is_dir():
        raise SystemExit(
            f"Missing source directory: {SOURCE}\n"
            "Copy pre-optimizer publish_files there before resampling."
        )
    rng = random.Random(SEED)
    results = []
    for mode, n in TARGET_COUNTS.items():
        results.append(resample(mode, n, rng))

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"{'Mode':<15} | {'N':>10} | {'FS %':>8} | {'Wincap':>6} | {'RTP':>10} | {'Size':>8}")
    print("-" * 70)
    for r in results:
        print(
            f"  {r['mode']:<13} |"
            f" {r['target_n']:>10,} |"
            f" {r['fs_pct']:>7.4f}% |"
            f" {r['wincap_count']:>6} |"
            f" {r['empirical_rtp']:>10.6f} |"
            f" {r['size_mb']:>6.1f} MB"
        )


if __name__ == "__main__":
    main()
