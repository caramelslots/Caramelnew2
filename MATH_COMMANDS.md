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

```bash
NUM_SIMS=200 $PY run_small.py
```

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

## 1b. Duel only (`bonus_duel_cat` ~50% / `bonus_duel_dog` ~25%)

```bash
NUM_SIMS=200 $PY run_bonus_duel.py 2>&1 | tee /tmp/m5_bonus_duel.log
# one side: MODE=bonus_duel_dog NUM_SIMS=200 $PY run_bonus_duel.py
$PY tools/assert_duel_invariants.py
# fixtures: $PY run_storybook.py && $PY sync_to_web_sdk.py
```

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
