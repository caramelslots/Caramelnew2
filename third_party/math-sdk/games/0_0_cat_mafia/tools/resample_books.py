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
    cd third_party/math-sdk/games/0_0_cat_mafia
    PYTHONPATH=../..:. /tmp/csmath_venv/bin/python tools/resample_books.py --100k
    # M6 / duel-sized books (~40GB json → ~260GB if loaded in RAM): ALWAYS use low-mem
    PYTHONPATH=../..:. /tmp/csmath_venv/bin/python tools/resample_books.py --1m --jobs 1 --low-mem
    # Small smoke (custom N):
    PYTHONPATH=../..:. /tmp/csmath_venv/bin/python tools/resample_books.py --target-n 10000 \\
        --modes base --jobs 1 --low-mem

Originals are NOT touched by this script — see
`library/publish_files_backup_pre_resample/` for the snapshot taken before
running. The new files are written directly to `library/publish_files/` and
`library/configs/books_*.verification.json`.

--low-mem
=========
Does not load all book bodies into RAM. Pass 1 streams zst → temp jsonl +
id→offset index on disk; pass 2 seeks/writes sampled ids in order. Same
seed/RTP/force-max logic as the in-memory path. Slower, safe for 128GB hosts.
"""

from __future__ import annotations

import argparse
import _pickle
import csv
import hashlib
import io
import json
import os
import random
import shutil
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import zstandard as zstd

ROOT = Path(__file__).resolve().parent.parent
# Override for tests: RESAMPLE_PUBLISH / RESAMPLE_SOURCE / RESAMPLE_CONFIGS
PUBLISH = Path(os.environ.get("RESAMPLE_PUBLISH", ROOT / "library" / "publish_files"))
SOURCE = Path(
    os.environ.get("RESAMPLE_SOURCE", ROOT / "library" / "publish_files_backup_pre_resample")
)
CONFIGS = Path(os.environ.get("RESAMPLE_CONFIGS", ROOT / "library" / "configs"))

# Cat Mafia modes only (no special_spins — that mode exists only in Wok Fury).
MODES = (
    "base",
    "bonus_boost",
    "bonus_normal",
    "bonus_super",
    "bonus_duel_cat",
    "bonus_duel_dog",
)

RESAMPLE_PRESETS = {
    "100k": 100_000,   # M5 — intermediate sim, faster iteration
    "1m": 1_000_000,   # M6 — production publish to Stake RGS
}


def target_counts_for(preset: str, modes: tuple[str, ...] | None = None) -> dict[str, int]:
    n = RESAMPLE_PRESETS[preset]
    use = modes if modes is not None else MODES
    return {mode: n for mode in use}

COST_MAP = {
    "base":          1,
    "bonus_boost":   2,
    "bonus_normal":  100,
    "bonus_super":   200,
    "bonus_duel_cat":    150,
    "bonus_duel_dog":    150,
}

SEED = 42
TARGET_RTP = 0.9601
SEED_SEARCH_RANGE = 256

# Buy modes: force exactly one official max-win book into equal-weight output.
# RTP impact ≈ 25000 / N / cost (normal ~0.25%, super ~0.125%); seed search
# cools the other N-1 books so SUMMARY RTP stays ~0.9601.
FORCE_MAX_WIN_MODES = {"bonus_normal", "bonus_super", "bonus_duel_cat", "bonus_duel_dog"}
MAX_WIN_BET_MULT = 25_000
MAX_WIN_PAYOUT_CENTS = MAX_WIN_BET_MULT * 100  # payoutMultiplier units


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


def _iter_book_lines_zst(path: Path):
    """Yield raw line bytes (without trailing newline) from books_*.jsonl.zst."""
    dctx = zstd.ZstdDecompressor()
    with path.open("rb") as f:
        with dctx.stream_reader(f) as reader:
            buf = b""
            while True:
                chunk = reader.read(8 * 1024 * 1024)
                if not chunk:
                    break
                buf += chunk
                while True:
                    i = buf.find(b"\n")
                    if i < 0:
                        break
                    line = buf[:i]
                    buf = buf[i + 1 :]
                    if line.strip():
                        yield line
            if buf.strip():
                yield buf


def build_book_disk_index(
    mode: str, temp_jsonl: Path
) -> tuple[dict[int, int], set[int], dict[int, str], set[int]]:
    """Stream zst → uncompressed temp jsonl; return offsets + light meta.

    Returns:
      offsets: book_id → byte offset in temp_jsonl
      book_ids: set of ids seen
      criteria_by_id: id → criteria string (may be "")
      fs_ids: ids that look like freegame books
    """
    zst_path = SOURCE / f"books_{mode}.jsonl.zst"
    if not zst_path.exists():
        raise SystemExit(f"missing source books: {zst_path}")

    offsets: dict[int, int] = {}
    book_ids: set[int] = set()
    criteria_by_id: dict[int, str] = {}
    fs_ids: set[int] = set()

    print(f"  [low-mem] indexing {zst_path.name} → {temp_jsonl.name} ...", flush=True)
    n = 0
    with temp_jsonl.open("wb") as out:
        for raw in _iter_book_lines_zst(zst_path):
            # Parse once for id/meta; write exact bytes + newline for later seek.
            book = json.loads(raw)
            sid = int(book["id"])
            if sid in offsets:
                raise SystemExit(f"duplicate book id {sid} in {zst_path.name}")
            pos = out.tell()
            out.write(raw)
            out.write(b"\n")
            offsets[sid] = pos
            book_ids.add(sid)
            crit = str(book.get("criteria") or "")
            criteria_by_id[sid] = crit
            if crit == "freegame" or float(book.get("freeGameWins") or 0) > 0:
                fs_ids.add(sid)
            n += 1
            if n % 200_000 == 0:
                print(f"  [low-mem] indexed {n:,} books...", flush=True)
    print(f"  [low-mem] indexed {n:,} books; temp={temp_jsonl.stat().st_size / 1e9:.2f} GB", flush=True)
    return offsets, book_ids, criteria_by_id, fs_ids


def read_book_at(temp_jsonl: Path, offset: int) -> dict:
    with temp_jsonl.open("rb") as f:
        f.seek(offset)
        line = f.readline()
    return json.loads(line)


def choose_seed(
    sim_ids: list[int],
    weights: list[int],
    payouts_by_id: dict[int, int],
    target_n: int,
    cost: float,
    forced_ids: list[int] | None = None,
) -> tuple[int, list[int], float]:
    """Pick seed whose empirical RTP is nearest TARGET_RTP.

    Optional forced_ids are always prepended (for official max-win presence).
    """
    forced_ids = list(forced_ids or [])
    n_draw = target_n - len(forced_ids)
    if n_draw < 0:
        raise SystemExit(f"forced_ids ({len(forced_ids)}) exceed target_n ({target_n})")

    best_seed = SEED
    best_sample: list[int] | None = None
    best_rtp = 0.0
    best_gap = float("inf")
    for seed in range(SEED_SEARCH_RANGE):
        drawn = random.Random(seed).choices(sim_ids, weights=weights, k=n_draw) if n_draw else []
        sample = forced_ids + drawn
        rtp = sum(payouts_by_id[sid] for sid in sample) / target_n / 100 / cost
        gap = abs(rtp - TARGET_RTP)
        if gap < best_gap:
            best_gap = gap
            best_seed = seed
            best_sample = sample
            best_rtp = rtp
    assert best_sample is not None
    return best_seed, best_sample, best_rtp


def _write_outputs(
    mode: str,
    sampled_ids: list[int],
    payouts_by_id: dict[int, int],
    book_loader,  # (orig_id) -> dict
) -> tuple[Path, int]:
    """Write equal-weight books + LUT + verification. Returns (books_path, size)."""
    out_books_path = PUBLISH / f"books_{mode}.jsonl.zst"
    PUBLISH.mkdir(parents=True, exist_ok=True)
    CONFIGS.mkdir(parents=True, exist_ok=True)

    cctx = zstd.ZstdCompressor()
    payout_ints: list[int] = []
    with open(out_books_path, "wb") as f:
        with cctx.stream_writer(f, closefd=False) as writer:
            buf = io.StringIO()
            for new_id, orig_id in enumerate(sampled_ids, start=0):
                book = dict(book_loader(orig_id))
                book["id"] = new_id
                buf.write(json.dumps(book, separators=(",", ":")))
                buf.write("\n")
                payout_ints.append(int(book["payoutMultiplier"]))
                if buf.tell() > 1_000_000:
                    writer.write(buf.getvalue().encode("utf-8"))
                    buf = io.StringIO()
                if (new_id + 1) % 200_000 == 0:
                    print(f"  wrote {new_id + 1:,}/{len(sampled_ids):,} books...", flush=True)
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
    return out_books_path, new_size


def resample(mode: str, target_n: int, rng: random.Random, *, low_mem: bool = False) -> dict:
    print(f"\n{'=' * 70}")
    print(f"Resampling mode = {mode}  (target N = {target_n:,})" + ("  [low-mem]" if low_mem else ""))
    print(f"{'=' * 70}")

    lut = read_lut(mode)
    print(f"  Original LUT rows : {len(lut):,}")

    temp_jsonl: Path | None = None
    books: dict[int, dict] | None = None
    offsets: dict[int, int] | None = None
    criteria_by_id: dict[int, str] = {}
    fs_ids: set[int] = set()

    try:
        if low_mem:
            temp_dir = Path(tempfile.mkdtemp(prefix=f"resample_{mode}_", dir=str(SOURCE)))
            temp_jsonl = temp_dir / "books.jsonl"
            offsets, book_ids, criteria_by_id, fs_ids = build_book_disk_index(mode, temp_jsonl)
        else:
            books = read_books(mode)
            book_ids = set(books.keys())
            criteria_by_id = {sid: str(b.get("criteria") or "") for sid, b in books.items()}
            fs_ids = {
                sid
                for sid, b in books.items()
                if b.get("criteria") == "freegame" or float(b.get("freeGameWins") or 0) > 0
            }

        print(f"  Original books    : {len(book_ids):,}")

        lut_ids = {sid for sid, _, _ in lut}
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

        forced_ids: list[int] = []
        if mode in FORCE_MAX_WIN_MODES:
            max_ids = [
                sid
                for sid, p in payouts_by_id.items()
                if p == MAX_WIN_PAYOUT_CENTS and criteria_by_id.get(sid) == "wincap_max"
            ]
            if not max_ids:
                max_ids = [sid for sid, p in payouts_by_id.items() if p == MAX_WIN_PAYOUT_CENTS]
            if not max_ids:
                raise SystemExit(
                    f"  ERROR: {mode} has no ×{MAX_WIN_BET_MULT} book "
                    f"(payoutMultiplier={MAX_WIN_PAYOUT_CENTS}). Re-run sims/opt for buy modes."
                )
            max_ids.sort(key=lambda sid: next(w for s, w, _ in lut if s == sid))
            forced_ids = [max_ids[0]]
            print(
                f"  Force-include max : id={forced_ids[0]} "
                f"(×{MAX_WIN_BET_MULT}, criteria={criteria_by_id.get(forced_ids[0])})"
            )

        seed_used, sampled_ids, pre_rtp = choose_seed(
            sim_ids, weights, payouts_by_id, target_n, cost, forced_ids=forced_ids
        )
        wincap_in_sample = sum(1 for sid in sampled_ids if sid in wincap_ids)
        max_win_in_sample = sum(
            1 for sid in sampled_ids if payouts_by_id[sid] == MAX_WIN_PAYOUT_CENTS
        )
        if seed_used != SEED:
            print(f"  Chosen seed {seed_used} (default {SEED}) | pre-write RTP {pre_rtp:.6f}")
        else:
            print(f"  Chosen seed {seed_used} | pre-write RTP {pre_rtp:.6f}")

        fs_in_sample = sum(1 for sid in sampled_ids if sid in fs_ids)

        raw_payout_sum = sum(payouts_by_id[sid] for sid in sampled_ids)
        rtp_normalized = raw_payout_sum / len(sampled_ids) / 100 / cost
        avg_payout_in_units = raw_payout_sum / len(sampled_ids) / 100

        print(f"  Empirical RTP     : {rtp_normalized:.6f}  (target 0.9601, cost={cost})")
        print(f"  Avg payout per spin: ×{avg_payout_in_units:.4f} bet")
        print(f"  FS books in output : {fs_in_sample:,} ({fs_in_sample / target_n * 100:.4f}%)")
        print(f"  Wincap books       : {wincap_in_sample:,}")
        if mode in FORCE_MAX_WIN_MODES:
            print(f"  Official ×{MAX_WIN_BET_MULT}   : {max_win_in_sample:,} book(s) in output")
        uniq = len(set(sampled_ids))
        print(f"  Unique source ids  : {uniq:,} / {target_n:,} sample", flush=True)

        if low_mem:
            assert offsets is not None and temp_jsonl is not None

            def book_loader(orig_id: int) -> dict:
                return read_book_at(temp_jsonl, offsets[orig_id])

        else:
            assert books is not None

            def book_loader(orig_id: int) -> dict:
                return books[orig_id]

        _, new_size = _write_outputs(mode, sampled_ids, payouts_by_id, book_loader)

        return {
            "mode": mode,
            "target_n": target_n,
            "fs_pct": fs_in_sample / target_n * 100,
            "wincap_count": wincap_in_sample,
            "max_win_count": max_win_in_sample if mode in FORCE_MAX_WIN_MODES else 0,
            "empirical_rtp": rtp_normalized,
            "size_mb": new_size / 1024 / 1024,
            "low_mem": low_mem,
            "unique_source_ids": uniq,
        }
    finally:
        if temp_jsonl is not None:
            tmp_dir = temp_jsonl.parent
            try:
                if temp_jsonl.exists():
                    temp_jsonl.unlink()
                if tmp_dir.exists() and tmp_dir.name.startswith("resample_"):
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    print(f"  [low-mem] cleaned temp {tmp_dir.name}", flush=True)
            except OSError as exc:
                print(f"  [low-mem] temp cleanup warning: {exc}", flush=True)


def _lut_is_equal_weight(path: Path) -> bool:
    weights: set[int] = set()
    with path.open() as f:
        for i, line in enumerate(f):
            parts = line.strip().split(",")
            if len(parts) < 2:
                continue
            weights.add(int(float(parts[1])))
            if i > 5000:
                break
    return weights == {1} or (weights and max(weights) <= 2)


def refresh_backup_from_publish(modes: tuple[str, ...] | None = None) -> None:
    """Copy weighted publish LUT+books → backup so resample uses latest opt/fix.

    Skips modes whose publish LUT is already equal-weight (already resampled),
    so we do not clobber a good weighted backup with a flat LUT.
    """
    SOURCE.mkdir(parents=True, exist_ok=True)
    copied = 0
    for mode in modes if modes is not None else MODES:
        lut = PUBLISH / f"lookUpTable_{mode}_0.csv"
        books = PUBLISH / f"books_{mode}.jsonl.zst"
        if not lut.exists() or not books.exists():
            print(f"  skip {mode}: missing publish lut/books")
            continue
        if _lut_is_equal_weight(lut):
            print(f"  skip {mode}: publish LUT looks equal-weight (use existing backup)")
            continue
        shutil.copy2(lut, SOURCE / lut.name)
        shutil.copy2(books, SOURCE / books.name)
        idx = PUBLISH / "index.json"
        if idx.exists():
            shutil.copy2(idx, SOURCE / "index.json")
        copied += 1
        print(f"  copied {mode} publish → backup_pre_resample")
    if copied == 0:
        print("  (no weighted publish LUTs copied — resampling from existing backup)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resample weighted publish LUTs into equal-weight books.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--100k",
        dest="preset",
        action="store_const",
        const="100k",
        help="100 000 books per mode (after M5)",
    )
    group.add_argument(
        "--1m",
        dest="preset",
        action="store_const",
        const="1m",
        help="1 000 000 books per mode (after M6 / production)",
    )
    group.add_argument(
        "--target-n",
        dest="target_n",
        type=int,
        default=None,
        help="Custom output books per mode (smoke tests, e.g. 10000).",
    )
    parser.add_argument(
        "--modes",
        default="",
        help="Comma-separated modes only (e.g. bonus_duel_cat,bonus_duel_dog). Default: all.",
    )
    parser.add_argument(
        "--jobs",
        type=int,
        default=0,
        help="Parallel mode workers (default: min(mode count, CPU count)). Use 1 to disable.",
    )
    parser.add_argument(
        "--low-mem",
        action="store_true",
        help=(
            "Stream books via disk index (no full dict in RAM). Required for M6 duel-sized "
            "pools on ≤128GB hosts. Implies safer sequential default when jobs unset."
        ),
    )
    parser.add_argument(
        "--no-low-mem",
        action="store_true",
        help="Force in-memory path even for --1m (needs ~260GB+ RAM for duel).",
    )
    return parser.parse_args()


def _default_jobs(n_modes: int, *, low_mem: bool) -> int:
    if low_mem:
        return 1
    cpus = os.cpu_count() or 4
    return max(1, min(n_modes, cpus))


def _run_resample_modes(
    target_counts: dict[str, int], jobs: int, *, low_mem: bool
) -> list[dict]:
    items = list(target_counts.items())
    if jobs <= 1 or len(items) <= 1:
        rng = random.Random(SEED)
        return [resample(mode, n, rng, low_mem=low_mem) for mode, n in items]

    if low_mem:
        print("Note: --low-mem with jobs>1 still loads one mode per worker; prefer --jobs 1")

    workers = min(jobs, len(items))
    print(f"Parallel resample: {workers} workers for {len(items)} mode(s)")
    results: list[dict] = []
    errors: list[str] = []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(resample, mode, n, random.Random(SEED), low_mem=low_mem): mode
            for mode, n in items
        }
        for fut in as_completed(futures):
            mode = futures[fut]
            try:
                results.append(fut.result())
            except Exception as exc:
                errors.append(f"{mode}: {exc}")
    if errors:
        raise SystemExit("resample failed:\n  " + "\n  ".join(errors))
    order = {m: i for i, m in enumerate(MODES)}
    results.sort(key=lambda r: order.get(r["mode"], 999))
    return results


def main():
    args = parse_args()
    modes: tuple[str, ...] | None = None
    if args.modes.strip():
        modes = tuple(m.strip() for m in args.modes.split(",") if m.strip())
        unknown = [m for m in modes if m not in MODES]
        if unknown:
            raise SystemExit(f"Unknown modes: {unknown}; allowed: {list(MODES)}")

    if args.target_n is not None:
        if args.target_n <= 0:
            raise SystemExit("--target-n must be positive")
        use = modes if modes is not None else MODES
        target_counts = {mode: args.target_n for mode in use}
        preset_label = f"target-n={args.target_n}"
    else:
        target_counts = target_counts_for(args.preset, modes)
        preset_label = args.preset

    low_mem = bool(args.low_mem)
    preset = getattr(args, "preset", None)
    if preset == "1m" and not args.no_low_mem:
        # Duel 1M books ≈ 260GB in-memory; default to disk path for --1m.
        low_mem = True
    if args.no_low_mem:
        low_mem = False

    n_per_mode = next(iter(target_counts.values()))
    print(
        f"Resample preset: {preset_label} ({n_per_mode:,} books per mode) "
        f"modes={list(target_counts)} low_mem={low_mem}"
    )
    if preset == "1m" and not low_mem:
        print(
            "WARNING: --1m without low-mem needs ~260GB+ RAM per duel mode. "
            "Prefer omitting --no-low-mem."
        )

    print("Refreshing backup_pre_resample from publish_files (weighted only)...")
    refresh_backup_from_publish(modes)
    if not SOURCE.is_dir():
        raise SystemExit(
            f"Missing source directory: {SOURCE}\n"
            "Run optimization so library/publish_files has weighted LUTs first."
        )
    jobs = args.jobs if args.jobs > 0 else _default_jobs(len(target_counts), low_mem=low_mem)
    print(f"jobs={jobs}")
    results = _run_resample_modes(target_counts, jobs, low_mem=low_mem)

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
