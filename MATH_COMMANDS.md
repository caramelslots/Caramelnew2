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

> Все следующие блоки **используют эти переменные**. Сначала запусти этот
> блок (или склей с командой ниже через `&&`).

---



## 1. M5 — intermediate sim (1e5 per mode, ~10-20 мин)

Когда: после правок `game_config.py` / `game_override.py` / `paylines` /
`paytable` / `reelstrips`. Перепишет `library/publish_files/` для demo +
RGS publish.

**Base low-vol + equal paw/SW (2026-07):** criteria `paw` и `sw_expand`
(quota **по 3%**), с лент BR0 убраны P и SW; XOR 50/50 если оба.
**bonus_boost** = тот же BR0/фичи, `freegame` quota **20%** (base 10%).
После правок:

```bash
# Полный пайплайн: run.py после opt сам делает paw≥3% + RTP≈96% на publish.
$PY run.py 2>&1 | tee /tmp/m5.log
# Затем resample (сам копирует weighted publish → backup, потом пишет equal-weight books):
$PY tools/resample_books.py
# SUMMARY base/boost должны быть ~0.960, paw ~3%. Затем sync §4.
```

Если `run.py` уже прошёл **без** пост-фикса — почини publish и пересэмплируй:

```bash
$PY tools/enforce_paw_hit_rate.py --mode base --lut-dir library/publish_files --paw 0.03 --rtp 0.9601
$PY tools/enforce_paw_hit_rate.py --mode bonus_boost --lut-dir library/publish_files --paw 0.03 --rtp 0.9601
$PY tools/resample_books.py
```

**Bonus max ×25000 (2026-07):** buy modes `bonus_normal` / `bonus_super`
имеют hard max **×25000** (Stake `max_win`), плюс soft jackpot **×2500**
(`criteria=wincap`) и ультра-редкий `wincap_max`. Base/boost остаются ×2500.
После смены обязателен M5 хотя бы для buy-режимов, затем `resample_books.py`
(force-include ровно 1 книгу ×25000, RTP seed-search дожимает ~0.9601).

**Bonus medium-vol (2026-07):** после смены FR / `sw_mult_weights` /
`game_optimization.py` (bonus scaling + m2m) обязателен M5 хотя бы для
`bonus_normal` + `bonus_super`, иначе LUT останется старой high-vol.

**ETL40** `bonus_boost`**:** если Stake ругается на ETL 40× (>0.800), переоптимизируй:
`$PY run_bonus_boost_etl.py` (нужен свежий `math_config` через `generate_configs`).

В `0_0_cat_mafia/run.py` должно быть `num_sim_args = 1e5` на режим и
`run_optimization: True`. Если видишь «Batch 1 of 5» и финиш за ~15 с —
это **не** M5 (остались dev `1e4` / optimization off).

```bash
$PY run.py 2>&1 | tee /tmp/m5.log
```

Проверка результата:

```bash
grep "^Thread 0 finished" /tmp/m5.log | tail -5     # последние RTP
grep -E "AssertionError|Error|Traceback" /tmp/m5.log # на всякий
```

После M5 → выполни **§4 Sync** для storybook fixtures.

---



## 2. M6 — production sim (1e6 per mode, ~2-4 часа)

Когда: финальная итерация перед публикацией на Stake RGS.

`run.py` уже на **1e6** per mode. Запуск:

```bash
$PY run.py 2>&1 | tee /tmp/m6.log
```

Проверка прогресса (~2-4 ч):

```bash
grep "^Thread 0 finished" /tmp/m6.log | tail -5
grep -E "AssertionError|Error|Traceback" /tmp/m6.log
```

После M6 → §3 Resample → §4 Sync.

---



## 3. Создание свежего resample (обновление backup'а)

Когда: перед публикацией в Stake RGS, чтобы их dashboard показывал
правильный RTP (~96%) вместо biased значения от forced-criteria sampling.

⚠️ Делай **сразу после M5/M6**, пока `publish_files/` свежий.

```bash
# 1. Сохранить свежий publish_files как новый backup для resa mple
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample
```

---



## 4. Применение resample (генерация unbiased books)

```bash
$PY tools/resample_books.py
```

Что произойдёт:

- читает из `library/publish_files_backup_pre_resample/` (свежий backup из §3)
- пишет в `library/publish_files/` resampled books (unbiased)
- обновляет `library/configs/books_*.verification.json`

⚠️ **Не вызывай resample БЕЗ предварительного §3** — иначе он перезатрёт
свежие `publish_files` resample'ом из старого snapshot'а.

---



## 5. Sync math → web (storybook fixtures для демки)

Когда: после M5/M6/resample, чтобы Storybook stories показывали
актуальные books.

```bash
$PY run_storybook.py && $PY sync_to_web_sdk.py
```

Что делает:

- `run_storybook.py` — генерит ~30-100 books на режим в `library/books/*.json`
(использует текущий `game_config.py` / `game_override.py`).
⚠️ **Защищён**: не трогает `publish_files/` (snapshot+restore внутри).
- `sync_to_web_sdk.py` — копирует `.json` → `apps/daloniil_test/src/stories/data/*.ts`.

После — Vite HMR подхватит. Если демка открыта, обнови вкладку (Cmd-Shift-R).

---



## Полный workflow перед публикацией

```bash
# 0. (один раз) переменные окружения
cd /Users/danylolepetynskyi/Desktop/Caramelnew2/third_party/math-sdk/games/0_0_cat_mafia
export PATH="$HOME/.cargo/bin:$PATH"
export PYTHONPATH=../..:.
PY=/tmp/csmath_venv/bin/python

# 1. M5 (или M6 для prod)
$PY run.py 2>&1 | tee /tmp/m5.log

# 2. Snapshot для resample
rm -rf library/publish_files_backup_pre_resample
cp -r library/publish_files library/publish_files_backup_pre_resample

# 3. Resample (unbias books для RGS dashboard)
$PY tools/resample_books.py

# 4. Sync для storybook
$PY run_storybook.py && $PY sync_to_web_sdk.py

# 5. Готово. publish_files/ — для Stake RGS, web-sdk fixtures — для демки/storybook.
```

---



## Workflow для итеративной разработки (без RGS publish)

Только M5 + sync, без resample (демка не зависит от bias).

```bash
$PY run.py 2>&1 | tee /tmp/m5.log
$PY run_storybook.py && $PY sync_to_web_sdk.py
```

---



## Очистка `library/` (если нужно начать с чистого листа)

```bash
rm -rf library/books library/configs library/forces library/lookup_tables \
       library/optimization_files library/temp_multi_threaded_files \
       library/publish_files \
       library/0_0_daloniil_test_full_statistics.xlsx \
       library/statistics_summary.json library/stats_summary.json
# library/publish_files_backup_pre_resample/ — сохранится (нужен для §4)
```

После — повтори §1 (M5).

---



## Assert: доп. FS без пуль

После shoot на +FS не должно быть `BT` / `bulletCollect` (включая padding):

```bash
$PY tools/assert_no_bullets_on_extra_fs.py
```

Запускай после `run_storybook.py` / M5 / resample.

---



## Связанные документы

- `third_party/math-sdk/games/0_0_daloniil_test/REDESIGN_PLAN.md` — план математических правок
- `third_party/math-sdk/games/0_0_daloniil_test/DEMO_ISSUES.md` — лог багов и фиксов в демке
- `third_party/math-sdk/games/0_0_daloniil_test/run.py` — main M5/M6 entrypoint (поменяй `num_sim_args` для M6)
- `third_party/math-sdk/games/0_0_daloniil_test/tools/resample_books.py` — resample logic + docstring

