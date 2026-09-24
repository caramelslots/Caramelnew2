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

---

## 1. M5 — intermediate sim (1e5 per mode, ~5-15 мин)

Быстрый smoke перед полным пайплайном:

```bash
NUM_SIMS=200 $PY run_small.py
```

Или вручную только sim (100 000 sims/mode):

```bash
$PY run_m5.py 2>&1 | tee /tmp/m5.log
```

---

## 2. M6 — production sim (1e6 per mode, ~2-4 часа)

```bash
$PY run_m6.py 2>&1 | tee /tmp/m6.log
```

После M6 вручную — тот же порядок: **backup → duel enforce (§3b) → resample --1m**.

---

## 3. Backup weighted publish (до resample)

Когда: сразу после M5/M6, пока `publish_files/` ещё **weighted** (не equal-weight).

```bash
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample
```

---

## 3b. Duel SMOOTH · VH — enforce win-тела (обязательно)

После §3, до §4:

```bash
$PY tools/match_duel_win_body.py --mode bonus_duel_cat \
  --lut-dir library/publish_files_backup_pre_resample --skip-lose &
pid_cat=$!
$PY tools/match_duel_win_body.py --mode bonus_duel_dog \
  --lut-dir library/publish_files_backup_pre_resample --skip-lose &
pid_dog=$!
wait $pid_cat $pid_dog

cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_cat_0.csv library/publish_files/
cp library/publish_files_backup_pre_resample/lookUpTable_bonus_duel_dog_0.csv library/publish_files/
```

---

## 4. Resample (equal-weight books для RGS / sampler)

Две команды — по размеру sim, из которого делался backup (§3 + §3b).
Modes resample'ятся **параллельно** (default: `min(число modes, CPU count)`).

### 4a. M5 — 100 000 books на режим

```bash
$PY tools/resample_books.py --100k
```

`resample_books` сам подхватит weighted backup (equal-weight publish не затирает backup).

Опции:

```bash
$PY tools/resample_books.py --100k --jobs 1          # последовательно (debug)
$PY tools/resample_books.py --100k --jobs 6          # явно 6 workers
```

### 4b. M6 / production — 1 000 000 books на режим

```bash
$PY tools/resample_books.py --1m
```

Те же `--jobs` / `--modes` работают и для `--1m`.

---

## 5. Sync math → web (storybook fixtures)

Когда: после resample, чтобы Storybook / Vite видели актуальные books.

```bash
$PY run_storybook.py && $PY sync_to_web_sdk.py
```
