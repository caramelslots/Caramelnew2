# Math SDK — quick command reference

Шпаргалка по основным командам разработки.

- **Cat Mafia (активная):** `games/0_0_cat_mafia`
- **Wok Fury (donor):** `games/0_0_daloniil_test`

Все команды запускаются из директории игры и предполагают, что venv
лежит в `/tmp/csmath_venv/`.

Для Cat Mafia замени путь игры на `0_0_cat_mafia` и web sync target —
`apps/cat_mafia` (уже в `sync_to_web_sdk.py` этой игры).

## 0. Venv (один раз, если `ModuleNotFoundError`)

```bash
/opt/homebrew/bin/python3.12 -m venv /tmp/csmath_venv
/tmp/csmath_venv/bin/pip install -r /Users/danylolepetynskyi/Desktop/Caramelnew2/third_party/math-sdk/requirements.txt
```

Проверка: `/tmp/csmath_venv/bin/python -c "import zstandard; print('OK')"`

---

## Общие переменные окружения

```bash
# Cat Mafia (default). For Wok Fury: …/games/0_0_daloniil_test
cd /Users/danylolepetynskyi/Desktop/Caramelnew2/third_party/math-sdk/games/0_0_cat_mafia
export PATH="$HOME/.cargo/bin:$PATH"
export PYTHONPATH=../..:.
PY=/tmp/csmath_venv/bin/python
```

---

## Full pipeline (рекомендуется)

Один скрипт = sim+opt → backup → **joint §3b+§3c** (SMOOTH · VH + Intrigue + RTP) → resample → assert/metrics/MD report → storybook sync.

```bash
cd third_party/math-sdk/games/0_0_cat_mafia

# M5 — 1e5 sims/mode, resample 100k
SKIP_VENV=1 bash run_m5_full.sh    # лог: /tmp/m5_full.log

# M6 — 1e6 sims/mode, resample 1m
SKIP_VENV=1 bash run_m6_full.sh    # лог: /tmp/m6_full.log
```

По умолчанию: `DUEL_INTRIGUE=1`, `DUEL_COMP_QUOTAS=1`, `DUEL_LOSE_MIRROR=0`.  
Параллелизм: sim/opt **20** потоков; §3b и §3c — cat+dog параллельно; resample `--jobs 6` (`RESAMPLE_JOBS`).  
Опции: `SKIP_M5=1` / `SKIP_M6=1`, `SKIP_3B=1`, `SKIP_3C=1`, `SKIP_STORYBOOK=1`.

Ниже — те же шаги вручную, если нужен кусок пайплайна.

---

## 1. M5 — intermediate sim only (1e5 per mode)

Быстрый smoke перед полным пайплайном:

```bash
NUM_SIMS=200 $PY run_small.py
```

Или только sim+opt (без 3b/3c/resample):

```bash
$PY run_m5.py 2>&1 | tee /tmp/m5.log
```

Полный M5 publish: `bash run_m5_full.sh` (см. выше).

---

## 2. M6 — production sim only (1e6 per mode)

```bash
$PY run_m6.py 2>&1 | tee /tmp/m6.log
```

Полный M6 publish: `bash run_m6_full.sh` (backup → §3b → §3c → resample --1m → sync).

---

## 3. Backup weighted publish (до resample)

Когда: сразу после M5/M6, пока `publish_files/` ещё **weighted** (не equal-weight).

```bash
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample
```

---

## 3b+3c. Joint SMOOTH · VH + Intrigue + RTP (обязательно)

После backup, до resample. **Один** проход вместо старых §3b→§3c
(последовательный §3c затирал win-body и ронял dog RTP до ~82%).

```bash
$PY tools/match_duel_joint_targets.py --mode bonus_duel_cat \
  --lut-dir library/publish_files_backup_pre_resample --rtp-tol 0.003 &
pid_cat=$!
$PY tools/match_duel_joint_targets.py --mode bonus_duel_dog \
  --lut-dir library/publish_files_backup_pre_resample --rtp-tol 0.003 &
pid_dog=$!
wait $pid_cat $pid_dog

cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_cat_0.csv \
   library/publish_files/
cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_dog_0.csv \
   library/publish_files/
```

Таргеты: `tools/duel_smooth_vh_targets.json` + `tools/duel_competition_targets.json`.  
Legacy-отдельно: `match_duel_win_body.py` / `match_duel_competition.py` (не использовать подряд).

---

## 3d. TARGET vs NOW — markdown report

```bash
$PY tools/report_duel_targets_md.py \
  --lut-dir library/publish_files \
  --out library/duel_targets_report.md


$PY tools/report_duel_targets_md.py \
  --lut-dir library/publish_files_backup_pre_resample \
  --out library/duel_targets_report_pre_resample.md
```

---

## 4. Resample (equal-weight books для RGS / sampler)

Две команды — по размеру sim, из которого делался backup (§3 + joint §3b+§3c).
Modes resample'ятся **параллельно** (default: `min(число modes, CPU count)`).

### 4a. M5 — 100 000 books на режим

```bash
$PY tools/resample_books.py --100k --jobs 1
```

Только duel после joint:

```bash
$PY tools/resample_books.py --100k --jobs 1 --modes bonus_duel_cat,bonus_duel_dog
```

### 4b. M6 / production — 1 000 000 books на режим

**Важно:** duel books ~40GB JSON → ~260GB в RAM. `--1m` по умолчанию включает `--low-mem` (стрим на диск). На 128GB:

```bash
$PY tools/resample_books.py --1m --jobs 1
# то же явно:
$PY tools/resample_books.py --1m --jobs 1 --low-mem
```

Кастомный N (после `NUM_SIMS=10000 RUN_OPT=1 $PY run_small.py` + backup):

```bash
$PY tools/resample_books.py --target-n 10000 --jobs 1 --low-mem --modes base
```

Опции: `--modes`, `--jobs 1`, `--no-low-mem` (только если есть ~300GB RAM).

---

## 5. Sync math → web (storybook fixtures)

Когда: после resample, чтобы Storybook / Vite видели актуальные books.

```bash
$PY run_storybook.py && $PY sync_to_web_sdk.py
```
