"""M6 — production full pipeline (1 000 000 sims per mode, ~2–4 h).

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  /tmp/csmath_venv/bin/python run_m6.py 2>&1 | tee /tmp/m6.log

Then: tools/resample_books.py --1m
"""

from run_full_pipeline import run_full_pipeline

if __name__ == "__main__":
    run_full_pipeline(
        int(1e6),
        label="M6",
        resample_preset="--1m",
    )
