"""Acceptance scan for the SW-on-strips + paw 3% + HIT/RTP invariants.

Run AFTER M5 + enforce + resample, on library/publish_files (resampled books):

  cd games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  $PY tools/acceptance_scan.py

Checks (base / bonus_boost):
  - RTP within ±0.0005 of baseline (0.9598 / 0.9602)
  - HIT within ±0.5pp of baseline (37.08% / 41.33%)
  - paw event rate (base part) == 3% ±0.3pp
  - SW curtain event rate (base part) == 3% ±0.3pp
  - XOR: 0 books with both pawCoinResolve and superWildExpand
  - max 1 SW on the base reveal board (visible rows); no SW in padding
Checks (bonus_normal / bonus_super):
  - publish books byte-identical to library/publish_files_backup_baseline
    (FS logic untouched — M5 must not re-run buy modes)
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
from pathlib import Path

import zstandard as zstd

ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "library" / "publish_files"
BASELINE = ROOT / "library" / "publish_files_backup_baseline"

FS_MARKERS = {"enterFreeSpin", "freeSpinTrigger", "freeSpinTargetPick", "startFreeSpin"}

# mode -> (cost, baseline_rtp, baseline_hit, paw_target, sw_target)
BASELINES = {
    "base": (1.0, 0.9598, 0.3708, 0.03, 0.03),
    "bonus_boost": (2.0, 0.9602, 0.4133, 0.03, 0.03),
}
BUY_MODES = ("bonus_normal", "bonus_super")

RTP_TOL = 0.0005
HIT_TOL = 0.005
FEATURE_TOL = 0.003


def scan_mode(mode: str) -> dict:
    path = PUBLISH / f"books_{mode}.jsonl.zst"
    stats = dict(
        books=0,
        pay_sum=0,
        hits=0,
        paw=0,
        sw=0,
        xor=0,
        multi_sw=0,
        sw_padding=0,
        fs=0,
    )
    dctx = zstd.ZstdDecompressor()
    with open(path, "rb") as fh, dctx.stream_reader(fh) as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            if not line.strip():
                continue
            book = json.loads(line)
            events = book.get("events") or []
            types = [e.get("type") for e in events if isinstance(e, dict)]
            stats["books"] += 1
            pay = int(book.get("payoutMultiplier", 0))
            stats["pay_sum"] += pay
            if pay > 0:
                stats["hits"] += 1

            fs_idx = next((i for i, t in enumerate(types) if t in FS_MARKERS), None)
            sw_idx = next((i for i, t in enumerate(types) if t == "superWildExpand"), None)
            paw_idx = next((i for i, t in enumerate(types) if t == "pawCoinResolve"), None)
            if fs_idx is not None:
                stats["fs"] += 1
            if sw_idx is not None and (fs_idx is None or sw_idx < fs_idx):
                stats["sw"] += 1
            if paw_idx is not None and (fs_idx is None or paw_idx < fs_idx):
                stats["paw"] += 1
            if sw_idx is not None and paw_idx is not None:
                stats["xor"] += 1

            # Base-part reveal board: SW count in visible rows / padding.
            reveal = next((e for e in events if e.get("type") == "reveal"), None)
            if reveal and (fs_idx is None or types.index("reveal") < fs_idx):
                board = reveal.get("board") or []
                vis = [c for col in board for c in col[1:-1]]
                pad = [col[0] for col in board if col] + [col[-1] for col in board if col]
                n_sw = sum(1 for c in vis if c.get("name") == "SW")
                if n_sw > 1:
                    stats["multi_sw"] += 1
                if any(c.get("name") == "SW" for c in pad):
                    stats["sw_padding"] += 1
    return stats


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    failures = 0
    for mode, (cost, base_rtp, base_hit, paw_t, sw_t) in BASELINES.items():
        s = scan_mode(mode)
        n = max(s["books"], 1)
        rtp = s["pay_sum"] / n / 100 / cost
        hit = s["hits"] / n
        paw = s["paw"] / n
        sw = s["sw"] / n
        print(f"\n=== {mode} (N={n:,}) ===")
        print(f"  RTP  {rtp:.4f}  (baseline {base_rtp}, tol ±{RTP_TOL})")
        print(f"  HIT  {100 * hit:.2f}% (baseline {100 * base_hit:.2f}%, tol ±{100 * HIT_TOL:.1f}pp)")
        print(f"  paw  {100 * paw:.2f}%  (target {100 * paw_t:.0f}%)")
        print(f"  sw   {100 * sw:.2f}%  (target {100 * sw_t:.0f}%)")
        print(f"  FS trigger {s['fs'] / n:.4f}  |  xor {s['xor']}  |  multiSW {s['multi_sw']}  |  swPad {s['sw_padding']}")

        def check(ok: bool, label: str) -> None:
            nonlocal failures
            if not ok:
                failures += 1
                print(f"  FAIL: {label}")

        check(abs(rtp - base_rtp) <= RTP_TOL, f"RTP {rtp:.4f} outside {base_rtp}±{RTP_TOL}")
        check(abs(hit - base_hit) <= HIT_TOL, f"HIT {hit:.4f} outside {base_hit}±{HIT_TOL}")
        check(abs(paw - paw_t) <= FEATURE_TOL, f"paw {paw:.4f} outside {paw_t}±{FEATURE_TOL}")
        check(abs(sw - sw_t) <= FEATURE_TOL, f"sw {sw:.4f} outside {sw_t}±{FEATURE_TOL}")
        check(s["xor"] == 0, "XOR violations (paw + curtain in one book)")
        check(s["multi_sw"] == 0, "multi-SW boards in base")
        check(s["sw_padding"] == 0, "SW in base padding")

    for mode in BUY_MODES:
        cur = PUBLISH / f"books_{mode}.jsonl.zst"
        ref = BASELINE / f"books_{mode}.jsonl.zst"
        if not ref.exists():
            print(f"\n=== {mode}: no baseline backup — skipped byte-diff ===")
            continue
        same = sha256(cur) == sha256(ref)
        print(f"\n=== {mode}: {'IDENTICAL to baseline' if same else 'CHANGED!'} ===")
        if not same:
            failures += 1
            print("  FAIL: buy-mode publish books changed (FS logic must stay 1:1)")

    print("\n" + ("ACCEPTANCE PASSED" if failures == 0 else f"ACCEPTANCE FAILED ({failures})"))
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
