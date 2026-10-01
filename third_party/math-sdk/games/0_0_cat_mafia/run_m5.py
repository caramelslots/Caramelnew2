"""M5 — intermediate full pipeline (100 000 sims per mode, ~10–20 min).

Usage:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  /tmp/csmath_venv/bin/python run_m5.py 2>&1 | tee /tmp/m5.log

Then: tools/resample_books.py --100k
"""

from run_full_pipeline import run_full_pipeline

if __name__ == "__main__":
    run_full_pipeline(
        int(1e5),
        label="M5",
        resample_preset="--100k",
    )
