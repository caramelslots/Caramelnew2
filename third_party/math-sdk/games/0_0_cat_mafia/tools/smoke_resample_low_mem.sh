#!/usr/bin/env bash
# Smoke: build tiny weighted LUT+books fixture, compare in-memory vs --low-mem output.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${PY:-/tmp/csmath_venv/bin/python}"
export PYTHONPATH="${PYTHONPATH:-../..:.}"
cd "$ROOT"

FIX="$ROOT/library/_resample_smoke_fixture"
rm -rf "$FIX"
mkdir -p "$FIX/source" "$FIX/publish_mem" "$FIX/publish_low" "$FIX/configs_mem" "$FIX/configs_low"

"$PY" - <<'PY'
import json, zstandard as zstd
from pathlib import Path

fix = Path("library/_resample_smoke_fixture")
src = fix / "source"
n = 500
# Weighted LUT: prefer higher ids a bit
with (src / "lookUpTable_base_0.csv").open("w") as f:
    for i in range(n):
        w = 1 + (i % 5)
        pay = (i % 17) * 100  # cents-ish
        f.write(f"{i},{w},{pay}\n")

cctx = zstd.ZstdCompressor()
with (src / "books_base.jsonl.zst").open("wb") as out:
    with cctx.stream_writer(out, closefd=False) as w:
        for i in range(n):
            book = {
                "id": i,
                "payoutMultiplier": (i % 17) * 100,
                "criteria": "freegame" if i % 11 == 0 else "basegame",
                "events": [{"type": "reveal", "index": 0, "board": [[{"name": "L1"}]]}],
            }
            if i % 11 == 0:
                book["freeGameWins"] = 100
            w.write((json.dumps(book, separators=(",", ":")) + "\n").encode())
print(f"fixture ready: {n} books in {src}")
PY

export RESAMPLE_SOURCE="$FIX/source"

echo "=== in-memory ==="
RESAMPLE_PUBLISH="$FIX/publish_mem" RESAMPLE_CONFIGS="$FIX/configs_mem" \
  "$PY" tools/resample_books.py --target-n 200 --modes base --jobs 1

echo "=== low-mem ==="
RESAMPLE_PUBLISH="$FIX/publish_low" RESAMPLE_CONFIGS="$FIX/configs_low" \
  "$PY" tools/resample_books.py --target-n 200 --modes base --jobs 1 --low-mem

"$PY" - <<'PY'
import hashlib, json, zstandard as zstd, io
from pathlib import Path

fix = Path("library/_resample_smoke_fixture")

def load_books(p):
    dctx = zstd.ZstdDecompressor()
    out = []
    with p.open("rb") as f:
        with dctx.stream_reader(f) as r:
            for line in io.TextIOWrapper(r, encoding="utf-8"):
                if line.strip():
                    out.append(json.loads(line))
    return out

def load_lut(p):
    return Path(p).read_text().strip().splitlines()

b1 = load_books(fix / "publish_mem/books_base.jsonl.zst")
b2 = load_books(fix / "publish_low/books_base.jsonl.zst")
l1 = load_lut(fix / "publish_mem/lookUpTable_base_0.csv")
l2 = load_lut(fix / "publish_low/lookUpTable_base_0.csv")
assert len(b1) == len(b2) == 200, (len(b1), len(b2))
assert l1 == l2, "LUT mismatch"
# Same seed path → identical book sequence (ids remapped 0..n)
for i, (a, b) in enumerate(zip(b1, b2)):
    a2 = dict(a); b2_ = dict(b)
    assert a2 == b2_, f"book {i} differs"
print("OK: low-mem == in-memory for 200-book smoke (LUT + books identical)")
PY

echo "smoke passed"
