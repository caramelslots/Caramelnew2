#!/usr/bin/env bash
# Full M6 publish pipeline (sim → backup → duel SMOOTH enforce → resample 1m → web sync).
#
# Usage:
#   cd third_party/math-sdk/games/0_0_cat_mafia
#   bash run_m6_full.sh
#
# Optional:
#   SKIP_VENV=1 bash run_m6_full.sh          # skip venv create/pip (reuse /tmp/csmath_venv)
#   SKIP_M6=1 bash run_m6_full.sh            # skip run_m6.py (backup/enforce/resample/sync only)
#   SKIP_STORYBOOK=1 bash run_m6_full.sh     # skip run_storybook + sync_to_web_sdk
#
# Log: /tmp/m6_full.log (and /tmp/m6.log for the sim step)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO_MATH_SDK="$(cd "$ROOT/../.." && pwd)"
REQUIREMENTS="$REPO_MATH_SDK/requirements.txt"
VENV="${VENV:-/tmp/csmath_venv}"
PY_BOOT="${PY_BOOT:-/opt/homebrew/bin/python3.12}"
LOG_FULL="${LOG_FULL:-/tmp/m6_full.log}"
LOG_M6="${LOG_M6:-/tmp/m6.log}"

exec > >(tee -a "$LOG_FULL") 2>&1

step() {
  echo
  echo "================================================================"
  echo ">>> $*"
  echo "================================================================"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

cd "$ROOT"

# --- 0) venv ---
if [[ "${SKIP_VENV:-0}" != "1" ]]; then
  step "0/6 Create venv + install requirements → $VENV"
  [[ -x "$PY_BOOT" ]] || die "python not found: $PY_BOOT"
  [[ -f "$REQUIREMENTS" ]] || die "missing requirements: $REQUIREMENTS"
  "$PY_BOOT" -m venv "$VENV"
  "$VENV/bin/pip" install -r "$REQUIREMENTS"
else
  step "0/6 SKIP_VENV=1 — using existing $VENV"
fi

PY="$VENV/bin/python"
[[ -x "$PY" ]] || die "venv python missing: $PY (run without SKIP_VENV=1)"

export PATH="${HOME}/.cargo/bin:${PATH}"
export PYTHONPATH="../..:."
export DUEL_LOSE_MIRROR="${DUEL_LOSE_MIRROR:-1}"
export DUEL_INTRIGUE="${DUEL_INTRIGUE:-1}"

"$PY" -c "import zstandard; print('zstandard OK')"

# --- 1) M6 sim + opt ---
if [[ "${SKIP_M6:-0}" != "1" ]]; then
  step "1/6 run_m6.py → $LOG_M6"
  "$PY" run_m6.py 2>&1 | tee "$LOG_M6"
else
  step "1/6 SKIP_M6=1 — assume library/publish_files already weighted from M6"
fi

[[ -d library/publish_files ]] || die "missing library/publish_files"

# --- 2) Backup weighted publish ---
step "2/6 Backup publish_files → publish_files_backup_pre_resample"
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample

# --- 3) Duel SMOOTH · VH enforce on weighted backup (cat + dog parallel) ---
step "3/6 match_duel_win_body (cat + dog parallel) + histogram"
enforce_fail=0
"$PY" tools/match_duel_win_body.py --mode bonus_duel_cat \
  --lut-dir library/publish_files_backup_pre_resample --skip-lose &
pid_cat=$!
"$PY" tools/match_duel_win_body.py --mode bonus_duel_dog \
  --lut-dir library/publish_files_backup_pre_resample --skip-lose &
pid_dog=$!
wait "$pid_cat" || enforce_fail=1
wait "$pid_dog" || enforce_fail=1
[[ "$enforce_fail" -eq 0 ]] || die "match_duel_win_body failed (cat and/or dog)"
"$PY" tools/duel_payout_histogram.py --lut-dir library/publish_files_backup_pre_resample

# resample_books refreshes backup FROM publish — copy enforced duel LUTs back so
# the weighted source stays SMOOTH (otherwise refresh would wipe enforce).
step "3b/6 Sync enforced duel LUTs backup → publish (for resample refresh)"
cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_cat_0.csv \
   library/publish_files/lookUpTable_bonus_duel_cat_0.csv
cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_dog_0.csv \
   library/publish_files/lookUpTable_bonus_duel_dog_0.csv

# --- 4) Resample 1M ---
step "4/6 resample_books.py --1m"
"$PY" tools/resample_books.py --1m

# --- 4b) Duel post-resample gates (SMOOTH + intrigue honesty) ---
step "4b/6 duel assert + intrigue metrics + publish histogram"
"$PY" tools/assert_duel_invariants.py --path library/publish_files/books_bonus_duel_cat.jsonl.zst
"$PY" tools/assert_duel_invariants.py --path library/publish_files/books_bonus_duel_dog.jsonl.zst
"$PY" tools/duel_intrigue_metrics.py
"$PY" tools/duel_payout_histogram.py --lut-dir library/publish_files

# --- 5) Storybook + web sync ---
if [[ "${SKIP_STORYBOOK:-0}" != "1" ]]; then
  step "5/6 run_storybook.py + sync_to_web_sdk.py"
  "$PY" run_storybook.py
  "$PY" sync_to_web_sdk.py
else
  step "5/6 SKIP_STORYBOOK=1"
fi

step "DONE — full M6 publish pipeline finished"
echo "Logs: $LOG_FULL  |  M6 sim: $LOG_M6"
