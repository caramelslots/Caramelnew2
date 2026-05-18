# Math SDK — quick command reference

Шпаргалка по основным командам разработки `0_0_daloniil_test`.
Все команды запускаются из директории игры и предполагают, что venv
лежит в `/tmp/csmath_venv/`.

## Общие переменные окружения

```bash
cd /Users/danylolepetynskyi/Desktop/Caramelnew2/third_party/math-sdk/games/0_0_daloniil_test
export PATH="$HOME/.cargo/bin:$PATH"
export PYTHONPATH=../..:.
PY=/tmp/csmath_venv/bin/python
```

> Все следующие блоки **используют эти переменные**. Сначала запусти этот
> блок (или склей с командой ниже через `&&`).

---

## 1. M5 — intermediate sim (1e5 per mode, ~10-15 мин)

Когда: после правок `game_config.py` / `game_override.py` / `paylines` /
`paytable` / `reelstrips`. Перепишет `library/publish_files/` для demo +
RGS publish.

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

Когда: финальная итерация перед публикацией. Тот же `run.py`, но с
большим `num_sim_args`. Меняем 1e5 → 1e6 в `run.py:31-37`:

```python
num_sim_args = {
    "base":          int(1e6),
    "bonus_boost":   int(1e6),
    "special_spins": int(1e6),
    "bonus_normal":  int(1e6),
    "bonus_super":   int(1e6),
}
```

Запуск (то же самое, что M5):

```bash
$PY run.py 2>&1 | tee /tmp/m6.log
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
cd /Users/danylolepetynskyi/Desktop/Caramelnew2/third_party/math-sdk/games/0_0_daloniil_test
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

## Связанные документы

- `third_party/math-sdk/games/0_0_daloniil_test/REDESIGN_PLAN.md` — план математических правок
- `third_party/math-sdk/games/0_0_daloniil_test/DEMO_ISSUES.md` — лог багов и фиксов в демке
- `third_party/math-sdk/games/0_0_daloniil_test/run.py` — main M5/M6 entrypoint (поменяй `num_sim_args` для M6)
- `third_party/math-sdk/games/0_0_daloniil_test/tools/resample_books.py` — resample logic + docstring
