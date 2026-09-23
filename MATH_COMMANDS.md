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

Быстрый smoke перед полным пайплайном:

```bash
NUM_SIMS=200 $PY run_small.py
```

Полный пайплайн (sim + opt + enforce + checks) на **100 000** sims/mode:

```bash
$PY run_m5.py 2>&1 | tee /tmp/m5.log
```

---

## 2. M6 — production sim (1e6 per mode, ~2-4 часа)

Когда: финальная итерация перед публикацией на Stake RGS.

Полный пайплайн на **1 000 000** sims/mode:

```bash
$PY run_m6.py 2>&1 | tee /tmp/m6.log
```

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

Две команды — выбирай по размеру sim, из которого делался backup (§3):

### 4a. M5 — 100 000 books на режим (~быстро, для итераций)

```bash
$PY tools/resample_books.py --100k
```

Когда: после M5 (§1), acceptance scan, storybook sync.

### 4b. M6 / production — 1 000 000 books на режим (перед Stake RGS)

```bash
$PY tools/resample_books.py --1m
```

---

## 5. Sync math → web (storybook fixtures для демки)

Когда: после M5/M6/resample, чтобы Storybook stories показывали
актуальные books.

```bash
$PY run_storybook.py && $PY sync_to_web_sdk.py
```

---
