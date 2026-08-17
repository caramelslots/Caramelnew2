# Cat Mafia — план: SW на лентах + штора 3% + «линии → монетки» + плавный вход/выход маскота + множители шторы в базе

Дата: 2026-08-17 (обновлено: добавлены Часть 5 — шторы ×2/×4/×6/×8 в base/boost, Часть 6 — плавное исчезновение маскота при FS-переходе)
Scope: `third_party/math-sdk/games/0_0_cat_mafia` (математика) + `third_party/web-sdk/apps/cat_mafia` (фронтенд).

**Статус реализации (2026-08-17):**
- 📋 Часть 5 (шторы ×2/×4/×6/×8 в base/boost): план ниже, шансы по иксам — таблица 5.1.
- 📋 Часть 6 (маскот плавно уходит в FS-переход): план ниже.
- ✅ Часть 3 (фронт, линии → монетки): `winInfo` держит фазу-1 при идущем следом `pawCoinResolve`; `pawCoinResolve` — холд `PAW_PHASE1_HOLD_MS` (550мс) + `clearWinSpotlight()` перед конверсией; `stateGame.pawPending` + исключение PB/PS/PG из димминга в `ReelSymbol.svelte`.
- ✅ Часть 4 (маскот): маунт/загрузка Spine на `preloadContent`, класс `ready` только при `showContent`, фейд `GAME_ENTRANCE_MS` (400мс, cubicOut) + задержка `MASCOT_ENTRANCE_DELAY_MS` (100мс); после первого входа — быстрый фейд 150мс.
- ✅ Часть 1 (SW на лентах): `BR0_WEIGHTS` +`"SW": 2` (после нормализации 1 стоп/барабан — смоук 3000 спинов: SW на доске 8.1%, ровно 1 SW, padding чист, натуральная штора ~3.2%, XOR 0). `force_sw_expand_on_board` удалён, добавлен `enforce_single_sw_base` (base-only), флаг `force_sw_expand` зачищен из конфига.
- ✅ Часть 2 (3% + инварианты): `tools/enforce_paw_hit_rate.py` обобщён — event-based флор SW (`--sw`), `match_hit_rate` (`--hit`, dead↔paying с протекцией paw/sw/FS/wincap), `match_rtp` переписан HIT-нейтрально (low-pay↔high-pay внутри paying). Подключено в `run.py` / `run_base_boost.py` / `run_base_lowvol.py` (только base+boost). Приёмка — `tools/acceptance_scan.py`.
- ⏳ M5 (`run_base_boost.py`) → resample → storybook → sync → acceptance scan.

---

## 0. Базлайн — замеры текущего publish (books_base.jsonl.zst, 100 000 книг, equal-weight после resample)

| Метрика | Сейчас | Цель |
|---|---|---|
| Paw (pawCoinResolve в базе) | **3.005%** (~1/33) | 3% (без изменений) |
| — bronze / silver / gold | 1276 / 1090 / 639 (42/36/21%) | — |
| Штора SW в **базе** (superWildExpand до FS-части) | **0.312%** (~1/321) | **3.0%** |
| Штора SW в FS-части книг | 313 (почти каждый FS-раунд) | без изменений |
| FS trigger | 314 (0.314%) | без изменений |
| XOR-нарушения (paw + SW в одном спине) | 0 | 0 |
| SW expand по барабанам | {0: 60, 1: 186, 2: 236, 3: 82, 4: 72} | любой барабан |

Почему так: квота 3% на `sw_expand` в `game_config.py` — это только квота форс-сэмплирования при симуляции. После оптимизации под RTP 96% + resample естественный вес SW-книг упал до 0.31%. Флор 3% держит только лапа (`tools/enforce_paw_hit_rate.py`), у шторы флора нет.

Текущая механика:
- Ленты `BR0` (220 стопов/барабан): из спецсимволов только `B` (4-5). Ни `SW`, ни лап, ни `W` (W убран со всех лент реворком 2026-08 — вайлд приходит только через штору).
- Paw: форс-посадка на случайную клетку (`force_paw_on_board`, фенс `force_paw`). На лентах лапы НЕТ — она только выглядит натурально.
- SW: форс-посадка `force_sw_expand_on_board` — искусственная «верхняя строка H2×5 + SW на среднем барабане (1/2/3)».
- Условие шторы в базе (`resolve_base_spin_features`): SW на доске **и** SW на выигрышной линии (`sw_positions_in_wins`). XOR с лапой — `resolve_xor` 50/50.
- Множитель SW в базе всегда ×1 (`mult_values: {basegame: {1: 1}}`); ×2/×4/×6/×8 и липкие колонки — только FS.

## 0.1 Ограничения SW (уточнение заказчика) + базлайн всех режимов

**Главный принцип:** логика работы SW во ВСЕХ режимах остаётся 1 в 1 как сейчас — гейт «SW на выигрышной линии» в базе, XOR с лапой, множитель ×1 в базе, отсутствие липкости в базе, вся FS-механика (липкие колонки, множители, кап 2). Меняются ровно две вещи:
1. **Источник символа:** SW появляется на лентах BR0 и выпадает естественно (сейчас на BR0 его нет — только форс-посадка `force_sw_expand_on_board`, которую убираем).
2. **Частота шторы в `base` и `bonus_boost` — 3%** (сейчас 0.312% / 0.536%).

Детализация ограничений:

1. **Максимум 1 SW за спин** в `base` и `bonus_boost` (оба режима играют базовые спины на BR0, gametype `basegame`). Если на борде выпало 2+ SW — оставляем один (случайный), остальные → L2. SW в padding-рядах (строки 0 и 4 за пределами сетки) тоже → L2, чтобы «второй» SW не подглядывал с края (аналог `_sync_sw_padding` в FS).
2. **`bonus_normal` / `bonus_super` (FS-режимы) — логика 1 в 1 как сейчас.** Не трогаем: `resolve_fs_spin_features`, `apply_fs_sw_board_rules`, `init_fs_sticky_sw`, `_sync_sw_padding`, стрипы FR0/FR1/FRWCAP, `sw_mult_weights`, freegame-фенсы. Их publish-файлы вообще не пересоздаём (M5 запускаем только для `base` + `bonus_boost` — см. 2.2).
3. **RTP и HIT-rate во ВСЕХ режимах — как сейчас.** Замеренный базлайн текущего publish (100k книг/режим):

   | Режим | RTP (норм. на стоимость) | HIT (payout>0) | Paw (base-часть) | Штора SW (base-часть) |
   |---|---|---|---|---|
   | `base` | 0.9598 | 37.08% | 3.005% | 0.312% |
   | `bonus_boost` | 0.9602 (1.9203/2) | 41.33% | 2.948% | 0.536% |
   | `bonus_normal` | 0.9601 (96.01/100) | 100% | 0% | 0% (SW только в FS) |
   | `bonus_super` | 0.9601 (192.03/200) | 100% | 0% | 0% (SW только в FS) |

   Цели после изменений: `base`/`bonus_boost` — RTP ≈ 0.9601 (±0.0005), HIT — как в базлайне (±0.5 п.п.), Paw ≈ 3.0%, штора ≈ 3.0%. `bonus_normal`/`bonus_super` — файлы не трогаем, значения сохраняются автоматически.

---

## Часть 1 — SW на лентах (как лапа: естественное выпадение)

### 1.1 `generate_reels.py` — добавить SW в BR0
- `BR0_WEIGHTS` (строки 82-88): добавить `"SW": 2` на все 5 барабанов (стартовое значение, как на FR0; тюнится на шаге 2.3).
- Обновить комментарий «paw/SW features NOT on strips».
- `BR0_ZW` (мёртвые ленты, dead-квота 46.9%) — **не трогаем**: SW-вайлд создаст выигрыши и сломает dead.
- `BR1`/`BR2` — не трогаем (boost/special используют свои ленты; решить на тюнинге, нужен ли SW там — сейчас boost играет на BR0-весах? Нет: `reel_weights` boost = BR0. BR1/BR2 сейчас не используются в distributions — проверить при реализации).
- Перегенерировать: `python3 generate_reels.py` (перезапишет `reels/*.csv`).
- NB: BR0 — также padding-ленты базы (`padding_reels[basegame_type] = BR0` в `game_config.py:145`) → SW будет виден в прокрутке — консистентно.

### 1.2 `game_override.py` — убрать искусственную посадку
- Удалить `force_sw_expand_on_board` (строки 182-203) и её вызов в `draw_board` (строка 147). Безопасно для FS: функция и так рано выходит на не-base gametype.
- Флаг `force_sw_expand` в `sw_expand_condition` (`game_config.py:183-189`) после этого инертен — оставить или зачистить вместе с функцией.
- Покрытие критерия `sw_expand` сохраняется через `check_repeat` (строки 119-134): «required event must fire» → rejection sampling до естественного SW-в-линии. При естественной частоте ~3-6% это дёшево.
- `force_paw_on_board` (строки 158-180) оставить как есть: на спинах фенса лапы он заменяет SW→L2 → XOR сохраняется конструкцией (лапы нет на лентах, вне фенса совпадение невозможно). `resolve_xor` (`game_features.py:105-119`) остаётся страховкой.
- **FS-логика не меняется (ограничение 2):** `resolve_fs_spin_features`, `apply_fs_sw_board_rules`, `init_fs_sticky_sw`, `_sync_sw_padding`, `expand_sw_columns` — без правок; стрипы FR0/FR1/FRWCAP и `sw_mult_weights` — без правок.

### 1.3 Максимум 1 SW за спин в base/bonus_boost (ограничение 1)
С натуральными SW на лентах возможен ленд 2-3 SW за спин — недопустимо.
- Новая функция `enforce_single_sw_base()` в `game_override.py`, вызов в `draw_board` сразу после блока `force_paw_on_board`, **только** для `self.gametype == self.config.basegame_type` (покрывает и `base`, и `bonus_boost` — оба играют базу на BR0; FS-части любых режимов идут по gametype `freegame` и не затрагиваются):
  1. Найти все SW на видимом борде (строки 1-3).
  2. Если их больше одного — оставить один случайный, остальные заменить на L2.
  3. Все SW в padding-рядах (строки 0 и 4) заменить на L2 — «второй» SW не должен подглядывать с края (тот же приём, что `_sync_sw_padding` делает для FS).
- Порядок важен: после paw-фенса (лапа уже могла снять SW) и до оценки линий.
- Побочный эффект: с ≤1 SW на борде вопрос области раскрытия (1.4) упрощается — раскрыться может максимум одна колонка.

### 1.4 Область раскрытия шторы — точка решения
Сейчас `_apply_super_wild_expand(sw_hits)` (`game_override.py:669-678`) раскрывает **все** landed SW, если хоть один в линии. После 1.3 на борде максимум один SW, поэтому:
- Гейт «SW в выигрышной линии» (`sw_positions_in_wins`, `game_features.py:96-102`) в `resolve_base_spin_features` (строки 449-461) остаётся как есть — раскрывается единственная колонка, только если её SW сделал линию.
- SW вне выигрыша остаётся на доске обычным вайлдом на этот спин (тизер) — в базе нет липкости, следующий спин перерисует борд.
- Множитель в базе остаётся ×1 — `assign_sw_mult_property` (`game_override.py:109-117`) берёт `mult_values.basegame = {1: 1}` автоматически.

### 1.5 Фронтенд
Правок не нужно: естественные ленды SW уже рендерятся по FS-пути (FR0 имеет SW×2/барабан). Two-beat презентация (линии → штора → линии) уже работает в базе.

---

## Часть 2 — Шанс шторы ровно 3%

### 2.1 Обобщить enforce-инструмент — `tools/enforce_paw_hit_rate.py`
Сейчас: мерит вес по **criteria-сегменту** (`_weight_pct`, сегментация из `library/lookup_tables/lookUpTableSegmented_<mode>.csv`, строка 235) и переносит вес dead→paw (`_move_weight`, строки 78-118), затем `match_rtp` (строки 142-179).

С натуральными SW на лентах сегмент ≠ событие: superWildExpand может всплыть и в basegame-сегменте. Поэтому:
- Добавить **event-based** замер: скан `books_<mode>.jsonl.zst` на наличие `superWildExpand` в базовой части книги (до FS-маркеров) — скрипт из раздела «Приёмка».
- Флорить до 3% обе фичи: paw (как сейчас) и sw (новое), доноры — dead (`DONORS_DEAD = ("0", "0_cluster")`, строка 30).
- **Новое: `match_hit_rate` (ограничение 3).** SW-вайлд на лентах поднимет частоту выигрышных спинов; флоры фич тоже двигают HIT. Добавить шаг выравнивания HIT к базлайну (base 37.08%, boost 41.33%): перенос веса между dead-сегментом и платными сегментами. Две независимые степени свободы: HIT регулируется парой (dead ↔ платные), RTP — переносом **внутри** платных сегментов (низкооплачиваемые ↔ фича-книги), что HIT не меняет. Порядок: `enforce_paw` → `enforce_sw` → `match_hit_rate(базлайн)` → `match_rtp(0.9601, только внутри платных)` → контрольный замер обоих.
- Работает по weighted LUT **до** resample (equal-weight LUT инструмент пропускает — строки 194-200).

### 2.2 Включить в пайплайн + ограничить скоуп режимов (ограничение 2)
- `run.py` (строки 66-87), `run_base_lowvol.py` (42-59), `run_base_boost.py` (44-63): в пост-опт шаг добавить вызов с `--sw 0.03` рядом с существующим `--paw 0.03`, плюс `--hit <базлайн режима>`.
- **M5 запускаем только для `base` и `bonus_boost`** (`target_modes` в run-скрипте, как это делает `run_base_lowvol.py`). `bonus_normal`/`bonus_super` не пересимулируем и не переоптимизируем: их publish-файлы (`books_*.jsonl.zst`, LUT) остаются текущими → RTP/HIT/логика FS сохраняются 1 в 1 буквально.
- Перед прогоном сделать бэкап `library/publish_files` и после — сверить, что файлы `*_bonus_normal*` и `*_bonus_super*` побайтово не изменились.

### 2.3 Тюнинг ленты
Итерация: вес SW в `BR0_WEIGHTS` → M5 → замер event-rate шторы. Цель: естественная частота **чуть выше** 3% (флор только дожимает). Ориентир: dead-сегменты (46.9%) SW не содержат → нужно P(SW в линии | BR0-спин) ≈ 5.5-6%.
- Если естественная частота сильно выше 3% — убавить вес SW на лентах (флор не умеет понижать, только RTP-дожим).
- Если HIT ушёл сильнее, чем `match_hit_rate` может вернуть без перекоса RTP — охладить ленту (чуть поднять веса L-символов за счёт средних) и повторить.

### 2.4 Прогон (по MATH_COMMANDS.md)
```bash
cd third_party/math-sdk/games/0_0_cat_mafia
export PATH="$HOME/.cargo/bin:$PATH" && export PYTHONPATH=../..:.
PY=/tmp/csmath_venv/bin/python
cp -r library/publish_files library/publish_files_backup_baseline   # бэкап ДО прогона
$PY run.py 2>&1 | tee /tmp/m5.log            # M5, 1e5/режим, ~10-20 мин (только base + bonus_boost)
diff <(zcat library/publish_files_backup_baseline/books_bonus_normal.jsonl.zst) \
     <(zcat library/publish_files/books_bonus_normal.jsonl.zst) && echo "bonus_normal untouched"
diff <(zcat library/publish_files_backup_baseline/books_bonus_super.jsonl.zst) \
     <(zcat library/publish_files/books_bonus_super.jsonl.zst) && echo "bonus_super untouched"
$PY tools/resample_books.py
$PY run_storybook.py && $PY sync_to_web_sdk.py
$PY tools/assert_no_bullets_on_extra_fs.py
```

---

## Часть 3 — Фронтенд: сначала линии, потом монетки (как штора)

**Диагноз.** Порядок событий в книге уже правильный: `reveal → winInfo → setWin → setTotalWin → pawCoinResolve → setTotalWin → finalWin` (проверено на книге id=57). Проблема во фронте:
- `winInfo` (`bookEventHandlerMap.ts:370-464`) включает затемнение невыигрышных символов (`winSpotlightActive`) и снимает его **фоновым таймером через 10 с** (`WIN_SPOTLIGHT_CLEAR_DELAY_MS = 10_000`, `constants.ts:1179`).
- `pawCoinResolve` (`bookEventHandlerMap.ts:796-852`) начинает конвертацию уже через 250 мс (`PAW_COIN_CONVERT_DELAY_MS`, строка 47) — глубоко внутри 10-секундного затемнения. Отсюда серая лапа и тусклые монетки.
- Штора решает то же самое явно: холд `SW_PHASE1_HOLD_MS = 550` → `clearWinSpotlight()` → штора (`bookEventHandlerMap.ts:693-696`).

### Изменения — `src/game/bookEventHandlerMap.ts`
1. **`winInfo`**: добавить `pawResolveFollows` (в книге позже есть `pawCoinResolve` и нет `superWildExpand`), по аналогии со `swExpandFollows` (строки 379-387): ранний return после `animateSymbols` (рядом со строкой 448-449) — линии держим, фоновой таймер затемнения не запускаем.
2. **`pawCoinResolve`**: вместо одиночных 250 мс — холд фазы-1 (новая константа `PAW_PHASE1_HOLD_MS = 550` в `constants.ts` рядом со `SW_PHASE1_HOLD_MS`, строка 1086) → `clearWinSpotlight()` (снимает затемнение + линии, строки 61-68) → конвертация рядов. Дальше без изменений: hat catch → полёт монет → `+= totalCoinWin`.
3. **Лапа не тускнеет во время линий** (полировка скриншота): флаг `pawPending` в `stateGame.svelte.ts` (рядом с `winSpotlightActive`, строка 208): ставится в `reveal`, если в книге есть `pawCoinResolve`; снимается в конце `pawCoinResolve` и на старте нового спина. В `ReelSymbol.svelte` условие дима (строки 113-122): исключение для PB/PS/PG при `pawPending` — лапа остаётся горящей во время линий (как SW в своей линии), затем конвертируется.

### Проверка
Storybook `ModeSpecialSpinsBook` / DevButtons на paw-книгах: линии играют (лапа горит) → линии уходят → лапа конвертирует ряды → монетки летят в шляпу. Без регресса обычных winInfo (таймер затемнения по-прежнему работает, когда paw в книге нет).

---

## Часть 4 — Маскот появляется постепенно, как Board

**Диагноз.** Board: `FadeContainer` (`Game.svelte:110`) — alpha-твин 0→1 за `GAME_ENTRANCE_MS = 400` мс (`constants.ts:1166`) в момент `gameEntrance.showContent`. Маскот (`MascotPlaceholder.svelte`): монтируется только при `showContent` (строки 36-50), затем **асинхронно** грузит Spine (json+atlas+webp) и по готовности вешает `.ready` → `opacity: 1` за **0.25 с** (CSS, строки 459-473). Поздно (загрузка стартует в момент входа) + резко (короткий несинхронный фейд).

### Изменения — `src/components/MascotPlaceholder.svelte` + `constants.ts`
1. **Ранний маунт:** контейнер и создание `SpinePlayer` — уже на `gameEntrance.preloadContent` (во время лоадера/transition), не на `showContent`. До входа держим `opacity: 0`.
2. **Синхронный старт:** класс готовности вешать только при `ready && gameEntrance.showContent` — фейд маскота стартует в тот же кадр, что и фейд доски.
3. **Те же параметры фейда:** transition opacity — 400 мс (= `GAME_ENTRANCE_MS`), easing cubicOut как у svelte `Tween` по умолчанию → `cubic-bezier(0.215, 0.61, 0.355, 1)`. Опционально задержка ~100 мс (`MASCOT_ENTRANCE_DELAY_MS`), чтобы маскот чуть следом за доской. Константы — рядом с `GAME_ENTRANCE_MS`.
4. **Fallback без поп-ина:** если плеер не успел загрузиться к входу — фейд по готовности тем же длинным фейдом; короткий 0.25-секундный путь убрать.
5. **Только первый вход:** при ресайзе/смене ориентации (пересоздание плеера) — быстрое появление, флаг «entranceDone».

### Проверка
Холодная загрузка (Cmd-Shift-R) на десктопе и телефоне: доска и маскот появляются вместе, плавно. Throttling сети: маскот не вспыхивает, дофейживается тем же фейдом.

---

## Часть 5 — Множители шторы ×2/×4/×6/×8 в base и bonus_boost

**Инварианты (те же, что в 0.1):** частота шторы остаётся ровно 3% в обоих режимах, RTP ≈ 0.9601 (±0.0005), HIT — базлайн (±0.5 п.п.). FS-режимы не трогаем.

### 5.1 Предлагаемое распределение (base = bonus_boost, оба играют базу на BR0)

`base_sw_mult_weights = {1: 55, 2: 24, 4: 13, 6: 5, 8: 3}` — ×1 остаётся типичным исходом, ×8 — редкая «специя». При шторе 3% от спинов:

| Множитель шторы | Доля среди штор | Шанс на спин | ≈ 1 из N спинов |
|---|---|---|---|
| ×1 | 55% | 1.65% | 61 |
| ×2 | 24% | 0.72% | 139 |
| ×4 | 13% | 0.39% | 256 |
| ×6 | 5% | 0.15% | 667 |
| ×8 | 3% | 0.09% | 1111 |

Средний множитель шторы: 0.55·1 + 0.24·2 + 0.13·4 + 0.05·6 + 0.03·8 ≈ **2.09** (штора в среднем платит ~в 2 раза больше, чем сейчас). Тюнинг — одной строкой весов (см. 5.4).

### 5.2 Почему это чисто и без побочек

- Множитель роллится при создании SW-символа (`assign_sw_mult_property`, `game_override.py:109-117`) из `mult_values.basegame` текущего условия — механика уже есть, используется в FS.
- **Лежачий SW (не в линии) множитель никогда не применяет:** любая линия через SW означает «SW на выигрышной позиции» → гейт `sw_positions_in_wins` → штора. Нет шторы → нет линии через SW → множитель ни на что не влияет. Обычная линейная математика базы не меняется.
- После раскрытия перевзвешивание линий идёт существующим путём (`_apply_super_wild_expand` → re-eval), множитель колонны применяется как в FS.
- Винкап базы ×2500 — книжный кап (`_fence_win_cap`) продолжает работать поверх.

### 5.3 Изменения — `game_config.py` (только)

1. Рядом со `sw_mult_weights` (строка 118) добавить:
   ```python
   # Base/boost curtain mults: ×1 common, ×8 rare spice. Curtain rate stays 3%
   # (enforce floor); RTP/HIT held by the post-opt LUT fix.
   self.base_sw_mult_weights = {1: 55, 2: 24, 4: 13, 6: 5, 8: 3}
   ```
2. Во **всех** девяти условиях заменить `mult_values.basegame` с `{1: 1}` на `dict(self.base_sw_mult_weights)`: `freegame_condition`, `basegame_condition`, `paw_condition`, `sw_expand_condition`, `zerowin_condition`, `zerowin_cluster_condition`, `wincap_condition`, `buy_normal_condition`, `buy_super_condition` (строки 153-254). `mult_values.freegame` везде остаётся как есть.
3. `game_override.py`, `game_features.py`, ленты — **не трогаем**.

### 5.4 Фронтенд

Правок не нужно: бейдж `×{curtain.mult}` уже рендерится (`SuperWildCurtainOverlay.svelte:40`), `expandSuperWildColumn(reel, mult)` штампует множитель на ячейки, суммы приходят из математики. Проверить визуально, что бейдж ×2+ читается на базовой шторе.

### 5.5 Цена по RTP и удержание инвариантов

Штора с E[mult] ≈ 2.09 удваивает свой RTP-вклад (~+2-3 п.п. RTP, точно замерит M5). Компенсация — существующим пост-опт шагом (`tools/enforce_paw_hit_rate.py`), он уже делает всё нужное:
- `enforce_sw` держит частоту шторы ровно 3% (event-based флор);
- `match_hit_rate` возвращает HIT к базлайну (dead ↔ платные);
- `match_rtp` гасит излишек RTP **HIT-нейтрально** (перенос внутри платных: высокооплачиваемые ↔ низкооплачиваемые книги).
То есть «платят» за множители не RTP и не HIT, а форма распределения не-feature выигрышей (чуть меньше средних выплат / чуть больше мёртвых — в пределах допусков).

### 5.6 Прогон и приёмка

Тот же пайплайн, что в 2.4: M5 только base+boost (`run_base_boost.py`) → resample → storybook/sync → `tools/acceptance_scan.py`. Дополнительно в acceptance-скан добавить гистограмму множителей базовых штор (`superWildExpand.expands[].mult`): ожидание ≈ 55/24/13/5/3 (±1 п.п. на ×1/×2, ±0.5 п.п. на ×6/×8) и суммарная частота 3%.
Если RTP/HIT не сходятся в допуски — охладить распределение (поднять долю ×1, например `{1: 65, 2: 20, 4: 10, 6: 4, 8: 1}`) и повторить M5.

---

## Часть 6 — Маскот плавно исчезает при переходе в FS (и обратно)

**Диагноз.** Переход base ⇄ FS: событие `transition` → `Transition.svelte:23` в том же кадре ставит `stateGame.transitionActive = true` → `Game.svelte:83` вешает `.pixi-stage.above-html-ui` (z-index 50) — Pixi со непрозрачными фоном/доском **мгновенно** перекрывает `.html-mascot-layer` (z42, `Game.svelte:187-191`). Маскот исчезает поп-кадром ещё до того, как облако реально закрыло экран (облако густеет ~к `TRANSITION_THEME_SWITCH_DELAY_MS = 193` мс). На выходе из перехода — симметричный поп-ин: `transitionActive = false` (`Transition.svelte:43`) опускает Pixi вниз в один кадр. Оба направления идут через тот же флаг.

### Изменения — `Game.svelte`, `MascotPlaceholder.svelte`, `constants.ts`

1. **Новая константа** `MASCOT_TRANSITION_FADE_MS = 300` (рядом с `MASCOT_ENTRANCE_DELAY_MS`): fade-out маскота; должен завершиться до закрытия облака.
2. **Отложенный z-flip** в `Game.svelte`: локальный `pixiAboveHtml` вместо прямого `transitionActive` в `above-html-ui` — при подъёме `transitionActive` выставляется через `MASCOT_TRANSITION_FADE_MS` (setTimeout с cleanup в `$effect`), при снятии — сразу false. `winOverlayActive` по-прежнему мгновенно: `class:above-html-ui={pixiAboveHtml || context.stateGame.winOverlayActive}` — поведение биг-вин оверлея не меняется.
3. **Fade-out/in маскота** в `MascotPlaceholder.svelte`:
   - `hiding = context.stateGame.transitionActive`; класс `ready` вешаем по `shown = revealed && !hiding`.
   - `transitionStyle`: при `hiding` — `opacity 300ms ease-in` (растворение под набегающим облаком, пока Pixi ещё ниже маскота); иначе fade-in — `GAME_ENTRANCE_MS` (400 мс) cubicOut, с задержкой `MASCOT_ENTRANCE_DELAY_MS` только на самом первом входе. Быстрый 150-мс путь из Части 4 упраздняется — все проявления единообразно 400 мс.
   - Z-флип происходит после завершения fade-out (шаг 2), поэтому поп-кадр исчезает; обратно маскот проявляется фейдом, т.к. в момент обратного флипа он на opacity 0.
4. Оба направления (base→FS и FS→base) покрыты одним флагом `transitionActive` — отдельных веток не нужно. `PawCoinOverlay` в том же слое не трогаем (монетки живут только внутри базового спина, переход mid-resolve невозможен).

### Проверка
Вход в FS (3 скаттера и через Buy Bonus) и выход из FS: маскот растворяется за ~300 мс до закрытия облака и проявляется за 400 мс после рассеивания, без поп-кадров. Биг-вин оверлей (`winOverlayActive`) — без изменений. Телефон (portrait) и десктоп.

---

## Порядок выполнения

1. **Часть 3 + Часть 4** (фронтенд, ~1 ч) — независимы от математики, видны сразу в девке. ✅ Сделано.
2. **Части 1 + 2** (математика, ~1-2 ч с M5) — независимы от фронта. ✅ Сделано (прогон M5 — на стороне заказчика).
3. **Часть 6** (фронтенд, ~30 мин) — независима.
4. **Часть 5** (математика, ~1 ч с M5) — одна строка весов + M5 base/boost + приёмка; дельта к уже сделанному пайплайну минимальна.

## Точки решений (отмечены в тексте)

- Какой из нескольких landed SW оставлять в `enforce_single_sw_base`: случайный (рекомендую) vs первый по порядку барабанов.
- Стартовый вес SW на BR0: 2/барабан, тюнинг симуляцией.
- Лапа остаётся форс-посадкой (не на лентах) — «как у лапы» достигается натуральным лендом SW, не наоборот.
- SW, выпавший без выигрышной линии, остаётся на спин обычным вайлдом — это **не новая логика**, а существующее поведение кода (`evaluate_lines_board` уже считает SW вайлдом; ветка «SW есть, но не в линии → ничего не делаем» в `resolve_base_spin_features` уже есть, просто сегодня недостижима из-за форс-посадки). Менять ничего не нужно.
- Допуски приёмки: RTP ±0.0005, HIT ±0.5 п.п. от базлайна — подтвердить.
- Распределение множителей базовой шторы `{1: 55, 2: 24, 4: 13, 6: 5, 8: 3}` (таблица 5.1) — стартовая точка; тюнинг одной строкой, при перекосе RTP/HIT охладить до `{1: 65, 2: 20, 4: 10, 6: 4, 8: 1}`.
- Fade-out маскота в FS-переход 300 мс — подогнан под закрытие облака (~193 мс + запас); если визуально облако закрывается раньше — уменьшить `MASCOT_TRANSITION_FADE_MS`.

## Приёмка (после M5 + resample)

Скан опубликованных книг **всех режимов** — ожидание:
- `base`: RTP ≈ 0.9601 (±0.0005), HIT ≈ 37.08% (±0.5 п.п.), paw ≈ 3.0%, штора ≈ 3.0%, XOR = 0.
- `bonus_boost`: RTP ≈ 0.9602 (норм. на cost 2), HIT ≈ 41.33% (±0.5 п.п.), paw ≈ 3.0%, штора ≈ 3.0%, XOR = 0.
- `bonus_normal` / `bonus_super`: файлы побайтово равны бэкапу (проверяется diff'ом в 2.4), скан — для контроля.

```bash
/tmp/csmath_venv/bin/python - <<'EOF'
import io, json, zstandard
from collections import Counter

base_dir = "third_party/math-sdk/games/0_0_cat_mafia/library/publish_files"
dctx = zstandard.ZstdDecompressor()
FS_MARKERS = {"enterFreeSpin", "freeSpinTrigger", "freeSpinTargetPick", "startFreeSpin"}
COST = {"base": 1, "bonus_boost": 2, "bonus_normal": 100, "bonus_super": 200}
BASELINE = {  # режим: (RTP_норм, HIT%)
    "base": (0.9598, 37.08), "bonus_boost": (0.9602, 41.33),
    "bonus_normal": (0.9601, 100.0), "bonus_super": (0.9601, 100.0),
}

for mode in ["base", "bonus_boost", "bonus_normal", "bonus_super"]:
    counts, total, rtp_sum, hits = Counter(), 0, 0.0, 0
    with open(f"{base_dir}/books_{mode}.jsonl.zst", "rb") as fh, dctx.stream_reader(fh) as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            if not line.strip():
                continue
            total += 1
            book = json.loads(line)
            types = [e.get("type") for e in (book.get("events") or [])]
            pay = book.get("payoutMultiplier", 0) / 100.0
            rtp_sum += pay
            hits += pay > 0
            fs_idx = next((i for i, t in enumerate(types) if t in FS_MARKERS), None)
            sw_idx = next((i for i, t in enumerate(types) if t == "superWildExpand"), None)
            paw_idx = next((i for i, t in enumerate(types) if t == "pawCoinResolve"), None)
            if sw_idx is not None and (fs_idx is None or sw_idx < fs_idx):
                counts["sw_base"] += 1
            if paw_idx is not None and (fs_idx is None or paw_idx < fs_idx):
                counts["paw_base"] += 1
            if sw_idx is not None and paw_idx is not None:
                counts["XOR_violation"] += 1
    rtp = rtp_sum / total / COST[mode]
    hit = hits / total * 100
    b_rtp, b_hit = BASELINE[mode]
    print(f"{mode}: RTP={rtp:.4f} (базлайн {b_rtp}, {'OK' if abs(rtp-b_rtp)<=0.0005 else 'DRIFT'}) "
          f"HIT={hit:.2f}% (базлайн {b_hit}, {'OK' if abs(hit-b_hit)<=0.5 else 'DRIFT'}) "
          f"paw={counts['paw_base']/total*100:.3f}% sw_base={counts['sw_base']/total*100:.3f}% "
          f"XOR={counts['XOR_violation']}")
EOF
```
