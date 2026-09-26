#!/usr/bin/env bash
# Full M6 publish pipeline:
#   0 venv → 1 sim+opt (1e6) → 2 backup → 3b SMOOTH · VH → 3c competition
#   → 4 resample 1m → gates → 5 storybook + sync math→web
#
# Usage:
#   cd third_party/math-sdk/games/0_0_cat_mafia
#   bash run_m6_full.sh
#
# Optional:
#   SKIP_VENV=1 bash run_m6_full.sh          # reuse /tmp/csmath_venv
#   SKIP_M6=1 bash run_m6_full.sh            # skip run_m6.py (post steps only)
#   SKIP_STORYBOOK=1 bash run_m6_full.sh     # skip run_storybook + sync_to_web_sdk
#   SKIP_3B=1 / SKIP_3C=1                    # skip individual duel LUT steps
#   RESAMPLE_JOBS=6                          # parallel mode workers for resample (default 6)
#
# Parallelism:
#   M6 sim/opt: 20 threads (run_full_pipeline)
#   §3b / §3c:  cat + dog in parallel
#   resample:   --jobs ${RESAMPLE_JOBS:-6}
#
# Env (defaults):
#   DUEL_INTRIGUE=1  DUEL_COMP_QUOTAS=1  DUEL_LOSE_MIRROR=0
#
# Log: /tmp/m6_full.log  |  sim: /tmp/m6.log
# See MATH_COMMANDS.md §§3–5

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
  step "0/8 Create venv + install requirements → $VENV"
  [[ -x "$PY_BOOT" ]] || die "python not found: $PY_BOOT"
  [[ -f "$REQUIREMENTS" ]] || die "missing requirements: $REQUIREMENTS"
  "$PY_BOOT" -m venv "$VENV"
  "$VENV/bin/pip" install -r "$REQUIREMENTS"
else
  step "0/8 SKIP_VENV=1 — using existing $VENV"
fi

PY="$VENV/bin/python"
[[ -x "$PY" ]] || die "venv python missing: $PY (run without SKIP_VENV=1)"

export PATH="${HOME}/.cargo/bin:${PATH}"
export PYTHONPATH="../..:."
export DUEL_INTRIGUE="${DUEL_INTRIGUE:-1}"
export DUEL_COMP_QUOTAS="${DUEL_COMP_QUOTAS:-1}"
export DUEL_LOSE_MIRROR="${DUEL_LOSE_MIRROR:-0}"

echo "DUEL_INTRIGUE=$DUEL_INTRIGUE  DUEL_COMP_QUOTAS=$DUEL_COMP_QUOTAS  DUEL_LOSE_MIRROR=$DUEL_LOSE_MIRROR"
"$PY" -c "import zstandard; print('zstandard OK')"

# --- 1) M6 sim + opt (1e6 / mode) ---
if [[ "${SKIP_M6:-0}" != "1" ]]; then
  step "1/8 run_m6.py → $LOG_M6"
  "$PY" run_m6.py 2>&1 | tee "$LOG_M6"
else
  step "1/8 SKIP_M6=1 — assume library/publish_files already weighted from M6"
fi

[[ -d library/publish_files ]] || die "missing library/publish_files"

# --- 2) Backup weighted publish (§3) ---
step "2/8 Backup publish_files → publish_files_backup_pre_resample"
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample

# --- 3b+3c) Joint SMOOTH · VH + Intrigue + RTP (replaces sequential 3b→3c) ---
if [[ "${SKIP_3B:-0}" == "1" && "${SKIP_3C:-0}" == "1" ]]; then
  step "3b+3c/8 SKIP (SKIP_3B=1 and SKIP_3C=1)"
else
  step "3b+3c/8 match_duel_joint_targets (cat + dog parallel)"
  joint_fail=0
  "$PY" tools/match_duel_joint_targets.py --mode bonus_duel_cat \
    --lut-dir library/publish_files_backup_pre_resample \
    --rtp-tol "${RTP_TOL:-0.003}" &
  pid_cat=$!
  "$PY" tools/match_duel_joint_targets.py --mode bonus_duel_dog \
    --lut-dir library/publish_files_backup_pre_resample \
    --rtp-tol "${RTP_TOL:-0.003}" &
  pid_dog=$!
  wait "$pid_cat" || joint_fail=1
  wait "$pid_dog" || joint_fail=1
  [[ "$joint_fail" -eq 0 ]] || die "match_duel_joint_targets failed (cat and/or dog)"

  step "3b+3c-sync/8 Copy joint duel LUTs backup → publish"
  cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_cat_0.csv \
     library/publish_files/lookUpTable_bonus_duel_cat_0.csv
  cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_dog_0.csv \
     library/publish_files/lookUpTable_bonus_duel_dog_0.csv

  "$PY" tools/duel_payout_histogram.py --lut-dir library/publish_files_backup_pre_resample
  "$PY" tools/report_duel_targets_md.py \
    --lut-dir library/publish_files_backup_pre_resample \
    --out library/duel_targets_report_pre_resample.md
fi

# --- 4) Resample 1M (low-mem by default for --1m; jobs=1 avoids parallel RAM/disk spike) ---
RESAMPLE_JOBS="${RESAMPLE_JOBS:-1}"
step "4/8 resample_books.py --1m --jobs $RESAMPLE_JOBS (low-mem auto)"
"$PY" tools/resample_books.py --1m --jobs "$RESAMPLE_JOBS"

# --- 4b) Post-resample gates ---
step "4b/8 duel assert + intrigue metrics + SMOOTH histogram + MD report"
"$PY" tools/assert_duel_invariants.py --path library/publish_files/books_bonus_duel_cat.jsonl.zst
"$PY" tools/assert_duel_invariants.py --path library/publish_files/books_bonus_duel_dog.jsonl.zst
"$PY" tools/duel_intrigue_metrics.py
"$PY" tools/duel_payout_histogram.py --lut-dir library/publish_files
"$PY" tools/report_duel_targets_md.py --lut-dir library/publish_files \
  --out library/duel_targets_report.md

# --- 5) Storybook + web sync ---
if [[ "${SKIP_STORYBOOK:-0}" != "1" ]]; then
  step "5/8 run_storybook.py + sync_to_web_sdk.py"
  "$PY" run_storybook.py
  "$PY" sync_to_web_sdk.py
else
  step "5/8 SKIP_STORYBOOK=1"
fi

step "DONE — full M6 pipeline (sim → joint 3b+3c → 1m resample → sync)"
echo "Logs: $LOG_FULL  |  M6 sim: $LOG_M6"
echo "Competition targets: tools/duel_competition_targets.json"
echo "Targets report: library/duel_targets_report.md"
