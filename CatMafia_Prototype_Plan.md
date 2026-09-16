# Cat Mafia — План технической реализации прототипа

Источник: копируем `third_party/web-sdk/apps/daloniil_test` → **`apps/cat_mafia`**.  
`daloniil_test` **не трогаем** — остаётся как есть.  
Спека механик: `NewGame.md` / `CatMafia_Modes.md`

**Цель прототипа:** все режимы и фичи работают функционально.  
Старые ассеты Wok Fury переиспользуем где можно.  
Для ключевых новых объектов (**револьвер, мишени, гангстер-кот**) делаем **явные заглушки** (CSS/HTML + простые анимации), чтобы сразу видеть место и роль в UI — финальный арт подменим позже.

После ревью этого плана — поэтапная реализация.

---

## 0. Принципы прототипа

1. **Форкаем отдельное приложение:** копируем `daloniil_test` → **`cat_mafia`** (имя зафиксировано; обновляем `package.json` / pnpm filter). Дальше работаем только в копии.
2. Математика на первом этапе — **mock books / DevButtons**, не полный math-sdk.
3. Визуал = «понятно что происходит», не «финальный продакшен».
4. Старые механики, которые мешают (Progress Ladder, Mystery sticky reels, cat collect tiers) — **отключаем или заменяем**.
5. CSS/HTML-анимации допустимы везде, где нет готового Spine; для револьвера / мишеней / маскота заглушки **обязательны**, уровень детализации — **минимальный**.
6. На одном спине mock/book гарантирует **либо Paw, либо Super Wild** — никогда оба.
7. Первый проход layout — **desktop only**.
8. Math: сначала mock + DevButtons; затем обязательный **этап G** (math-sdk).

---

## 0.1 Этап 0 — Fork приложения (перед фичами) ✅

1. ~~Скопировать `apps/daloniil_test` → `apps/cat_mafia`.~~
2. ~~Обновить `package.json` name, порты, `gameName`/`gameID`, `GAME_TITLE` → **Cat Mafia**.~~
3. ~~`pnpm install` + `pnpm run build --filter=cat_mafia` — OK.~~
4. Дальше — Этап A и работа **только внутри** `apps/cat_mafia`.

|           |                         |
| --------- | ----------------------- |
| Package   | `cat_mafia`             |
| Dev       | `http://localhost:3008` |
| Storybook | `http://localhost:6008` |
| Game ID   | `0_0_cat_mafia`         |

---

## 1. Карта ассетов-заглушек

Пути «берём из» — относительно исходного `daloniil_test` / скопированных файлов в `cat_mafia`.  
Новые заглушки кладём в копию, напр. `apps/cat_mafia/src/components/placeholders/` + при необходимости `static/assets/placeholders/`.

### 1.1 Boot / Loading / Cards

| Нужно в Cat Mafia             | Берём из текущего слота                                                            | Как делаем заглушку                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Экран логотипа + progress bar | `static/assets/sprites/ui/loader/wok_fury_neon_logo.webp` + `static/logo-loader/*` | HTML overlay: логотип по центру + CSS progress bar, привязанный к `loadingProgress` из `GameAssetsLoader` |
| Карточки после загрузки       | `static/assets/sprites/ui/loader/loader_card_{1,2,3}.webp`                         | Те же карточки; тексты временно правим в i18n под новые фичи                                              |
| Click to Play                 | `PressToContinue.svelte`                                                           | Оставляем flow, но карточки показываем **только после** `loaded`                                          |
| Переход на доску              | `static/assets/spines/transition/*` + `TransitionAnimation.svelte`                 | Без изменений                                                                                             |

### 1.2 Доска / фон / HUD

| Нужно             | Берём                                                                        | Заглушка                                                 |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Фон base          | `static/assets/sprites/background/day.webp`                                  | Как есть                                                 |
| Фон bonus         | `static/assets/sprites/background/night.webp`                                | Как есть (маркер «мы в бонуске»)                         |
| Рамка доски       | `boardFrame/desk_day_base.webp`, `desk_night_base.webp`, `desk_contour.webp` | Как есть, подгоняем layout под 5×4                       |
| Spin / bet / menu | текущий HUD + `spines/spinButton/*`                                          | Как есть                                                 |
| Buy Bonus UI      | `static/assets/sprites/ui/buy_bonus/*`                                       | Как есть; **Boost тогл оставляем** в buy overlay         |
| Bonus Boost тогл  | `ui/bonus_switch/bonus_switch.webp`                                          | В **Autoplay** и **Buy Bonus**; с основной панели убрать |
| FS counter        | `fsLeftCounter/fs_left_counter.webp`                                         | Как есть                                                 |
| FS intro frame    | `spines/fsPopup/*` + `fsCong/*`                                              | Как есть; число FS подставляем динамически (8/10/12)     |

### 1.3 Символы на доске

| Новый символ / роль                           | Плейсхолдер-ассет                                               | Почему / как отличить                                                                       |
| --------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Low pays L1–L4                                | `sprites/symbolsNew/Low_{1..4}.webp` + spines `Low_*`           | Без изменений → при конвертации становятся бронзовой монетой ×1                             |
| High pays H1–H4                               | `sprites/symbolsNew/High_{1..4}.webp` + spines `High_*`         | Без изменений → серебряная ×2                                                               |
| Ordinary Wild `W`                             | `Special_2.webp` + spine `Special_2`                            | → золотая ×3 при конвертации ряда                                                           |
| Scatter `B` (триггер 3+)                      | `Special_1.webp` + spine `Special_1` (кот)                      | Плейсхолдер scatter                                                                         |
| **Paw `P`** (триггер ряда)                    | `bonusBar/cat_static.png` **или** `Special_1` с CSS badge `PAW` | Спецсимвол-лапа; сам платит **0**                                                           |
| Монетки после конвертации (не падают с рилов) | `sprites/coin/SD2_Coin.webp` + CSS tint                         | Бронза / серебро / золото фильтром + текст ×1/×2/×3; появляются **на местах** символов ряда |
| Super Wild `SW`                               | `Special_2` (Wild) + HTML/CSS badge множителя                   | Badge `×2/×4/×6/×8`; штора — CSS expand по столбцу                                          |
| Bullet (бонуска)                              | `SD2_Coin` с красным tint + label `BULLET`                      | Вместо лапы в FS                                                                            |
| Mystery `M`                                   | —                                                               | **Не используем** в геймплее прототипа                                                      |

Регистрация символов: `config.ts` → `assets.ts` → `constants.ts` (`SYMBOL_INFO_MAP`).

**Важно:** монетки — результат трансформации, не отдельный landing-символ на рилах. На рилы падает **`P` (лапа)**.

### 1.4 Гангстер-кот (маскот) — обязательная заглушка

Финального арта нет → делаем **отдельный placeholder-компонент** `MascotPlaceholder`, который потом легко заменить на Spine/спрайт.

| Нужно          | Заглушка (прототип)                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Внешний вид    | Силуэт/карточка кота: база `cat_static.png` или `Special_1` + CSS «федора» (тёмный овал шляпы) + усы-линия + подпись `CAT MAFIA` — чтобы читалось как маскот, не просто иконка бонуса |
| Позиция        | Справа-снизу от доски до края экрана                                                                                                                                                  |
| Idle           | CSS `translateY` / лёгкий pulse                                                                                                                                                       |
| Reaction / Wow | CSS shake + scale                                                                                                                                                                     |
| Clap           | CSS rotate ±8°                                                                                                                                                                        |
| Load bullet    | Патрон летит к коту → bounce                                                                                                                                                          |
| Aim & shoot    | Кот наклоняется, одна «лапа» закрывает глаз (CSS overlay), вспышка на мишени                                                                                                          |

Временный ассет-источник: `bonusBar/cat_static.png` / spine `Special_1`.  
Контракт API компонента (idle/react/load/shoot) фиксируем сразу, чтобы подмена арта не ломала handlers.

### 1.5 Револьвер / барабан — обязательная заглушка

| Нужно                          | Заглушка (прототип)                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Барабан (6 слотов)             | HTML/CSS: круглый «цилиндр» с 6 камерами, металлический градиент, номер слотов                                            |
| Заряженный патрон              | Маленький CSS-патрон или `SD2_Coin` red-tint в камере                                                                     |
| Пустая камера                  | Тёмный круг / отверстие                                                                                                   |
| Опционально: корпус револьвера | Упрощённый CSS side-view (рукоять + ствол) рядом с барабаном — чтобы игрок читал «это револьвер», не абстрактный progress |
| Анимация зарядки               | Камера подсвечивается + короткий rotate барабана при `bulletCollect`                                                      |
| Старый Progress Ladder         | **Скрыть**                                                                                                                |

Компонент: `RevolverDrumPlaceholder.svelte` (или `RevolverDrum.svelte` с пометкой placeholder).

### 1.6 Мишени — обязательная заглушка

| Нужно                | Заглушка (прототип)                                                       |
| -------------------- | ------------------------------------------------------------------------- |
| Мишень               | CSS: классический красно-белый круг (concentric rings), тень, лёгкий 3D   |
| Стойка (опционально) | Тонкая CSS «ножка» под кругом — чтобы выглядело как тир, не просто кружок |
| Flip / reveal        | CSS `rotateY` 180° → число на обороте (8/10/12 или +1/+2/+3 / пусто)      |
| Hit                  | Flash + scale + отверстие/crack CSS на попадании                          |
| Сетка                | 6 мишеней на выборе FS; отдельный набор на финальной стрельбе             |

Компоненты: `TargetPlaceholder.svelte`, оверлеи `TargetPickOverlay` / `TargetShootOverlay`.

### 1.7 Мешок монеток (после конвертации ряда)

| Нужно          | Берём                                                   | Заглушка                                                |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Мешок / сундук | CSS rounded panel + icon из `SD2_Coin`                  | После flip ряда → показывает сумму → fade → merge в WIN |
| Звон монет     | `sfx_bigwin_coinloop` / coin SFX из `audio/sounds.json` | Silent ok, если отдельного SFX нет                      |
| Coin fly       | `WinCoins.svelte` / `CoinParticleEmitter.svelte`        | Опционально при сборе                                   |

### 1.8 Super Wild «штора»

| Нужно             | Берём                                                    | Заглушка                            |
| ----------------- | -------------------------------------------------------- | ----------------------------------- |
| Символ SW         | Wild `Special_2` + badge                                 | См. выше                            |
| Раскрытие столбца | CSS overlay на reel column: wipe top→bottom              | Клетки столбца → Wild (`Special_2`) |
| Outline столбца   | `spines/outlineReel/*` или `cat_anticipation_frame.webp` | Подсветка столбца                   |

### 1.9 Wins / celebration

| Нужно     | Берём                     | Заглушка |
| --------- | ------------------------- | -------- |
| Big win   | `spines/bigwin/*`         | Как есть |
| Coin rain | `sprites/coin/SD2_Coin.*` | Как есть |
| Line wins | текущий `winInfo` flow    | Как есть |

---

## 2. Что выключаем / заменяем в текущем коде

| Текущая фича Wok Fury              | Действие в прототипе                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Progress Ladder + tier +3 FS       | Выключить UI и handlers (`ladderTierUp`, ladder collect flow)           |
| Sticky Mystery reels               | Выключить (`mysteryReel*`, `mysteryReveal`)                             |
| Bonus collect → ladder             | Заменить: в base scatter только триггерит FS; в bonus collect = bullets |
| Bonus Boost на основной панели     | Убрать                                                                  |
| Bonus Boost в Autoplay / Buy Bonus | **Оставить**                                                            |
| Board 5×5                          | Перевести на **5×4**                                                    |
| Фиксированные 10 FS                | Заменить сценой мишеней 8/10/12                                         |

Оставляем как инфраструктуру: book pipeline, buy bonus overlay shell (с Boost), FS intro/outro/counter, HUD, loader cards, win overlays, DevButtons.

---

## 3. Новые book events (черновик контракта)

| Event                             | Когда                                                                   | Payload (кратко)                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pawCoinResolve`                  | После остальных действий спина, если есть лапа (и нет SW на этом спине) | `{ paws: [{ reel, row }], rows: [{ row, cells: [{ reel, from, coinTier: 1\|2\|3\|0, win }] }], totalCoinWin }` |
| `superWildExpand`                 | Когда SW должен раскрыться (и нет лапы на этом спине)                   | `{ expands: [{ reel, row, mult }], productMult, boardAfter }`                                                  |
| `freeSpinTargetPick`              | Старт бонуса (natural/buy)                                              | `{ targets: number[6], chosenIndex, awardedFs }` — UI ждёт клик                                                |
| `bulletCollect`                   | Bonus spin, основные FS                                                 | `{ bullets: [{ reel, row }], drumCount }`                                                                      |
| `targetShootRound`                | После основных FS                                                       | `{ shots: [{ targetIndex, reward: 0\|1\|2\|3 }], extraFs }`                                                    |
| `updateFreeSpin`                  | Как сейчас                                                              | counter                                                                                                        |
| `freeSpinTrigger` / `freeSpinEnd` | Адаптировать                                                            | без ladder/mystery                                                                                             |

**Инвариант mock/math:** в одном book-спине не бывает одновременно активных `pawCoinResolve` и `superWildExpand`.

Существующие: `reveal`, `winInfo`, `setWin`, `setTotalWin`, `finalWin` — оставляем.

**Маппинг конвертации клетки:**

- Low → tier 1, win = `1 × bet`
- High → tier 2, win = `2 × bet`
- Wild → tier 3, win = `3 × bet`
- Scatter (`B`) → tier 3, win = `3 × bet` (как Wild)
- Paw (`P`) → tier 0, win = `0`

---

## 4. Этапы реализации

### Этап A — Каркас и layout (+ ключевые placeholder UI) ✅

**Результат:** `cat_mafia` грузится по новому flow, доска 5×4, Boost только где нужно; на экране заглушки маскота / (заготовка) барабана.

1. ~~Boot: logo + CSS progress → cards → Click to Play~~ (`LoaderLogoProgressOverlay`)
2. ~~Доска 5×4, ~20 paylines~~
3. ~~Boost убран с main panel; остаётся в Autoplay + Buy Bonus~~
4. ~~Progress Ladder / Mystery unlock UI скрыты~~
5. ~~`MascotPlaceholder` справа-снизу + idle CSS~~
6. ~~`RevolverDrumPlaceholder` заложен (скрыт до FS)~~

---

### Этап B — Лапа→монетки + Super Wild (base, mock) ✅

**Результат:** в base на mock-спинах видны конвертация ряда и SW-штора; XOR соблюдён.

1. ~~Символы `P` / `SW`~~ (alias Special_1 / Special_2)
2. ~~Badge PAW + SW multiplier text~~
3. ~~`PawCoinOverlay` (CSS coins + bag WIN)~~
4. ~~Handler `pawCoinResolve`~~
5. ~~Handler `superWildExpand` + `SuperWildCurtainOverlay`~~
6. ~~Mock: `stories/data/catmafia_events.ts`~~
7. ~~DevButtons: «Paw → Coins ($70)» / «Super Wild Curtain ×4»~~ (панель `SHOW_DEV_PANEL=true`)

**Проверка:** Shift+D / DEV panel → Cat Mafia (Stage B).

---

### Этап C — Триггер бонуса + сцена мишеней ✅

**Результат:** 3+ scatter или Buy-mock → 6 CSS-мишеней → выбор → старт FS с 8/10/12.

1. ~~Event `freeSpinTargetPick` + await click~~
2. ~~`TargetPickOverlay` (6 мишеней, flip 8/10/12)~~
3. ~~FS intro показывает динамическое `totalFs`~~
4. ~~Natural mock: 3×B → pick → trigger~~ (Dev: **FS + Target Pick**)
5. ~~Buy-style mock: pick → trigger~~ (Dev: **Buy FS + Target Pick**)
6. Реальный Buy через RGS получит ту же сцену, когда books содержат `freeSpinTargetPick` (этап G)

**Проверка:** Shift+D → Cat Mafia → FS + Target Pick / Buy FS + Target Pick.

---

### Этап D — Bonus loop: патроны + барабан + правила SW ✅

**Результат:** в FS крутятся спины, патроны копятся в CSS-барабане, SW ведёт себя по режиму.

1. ~~UI `RevolverDrum` (CSS, 6 слотов) вместо ladder~~
2. ~~`bulletCollect`: fly CSS с клетки → слот барабана; маскот load animation~~
3. ~~В FS лапа не спавнится (mock books)~~
4. ~~Normal: SW лежит→открывается→sticky; Super: sticky open с 1-го FS; только 1 SW~~
5. ~~Патроны только на основных FS~~ (`fsExtraPhase` блокирует collect)
6. ~~DevButtons: +bullet, fill drum, force SW modes~~

**Ассеты этапа:** CSS drum, bullet tint, cat_static, Wild/SW.

**Проверка:** Shift+D → Cat Mafia → `+Bullet → Drum` / `Fill Drum` / `FS SW Normal` / `FS SW Super`.

---

### Этап E — Финальная стрельба + доп. FS ✅

**Результат:** после основных FS авто-стрельба, возможны +FS без второго раунда.

1. ~~Overlay `TargetShootOverlay`~~
2. ~~Event `targetShootRound`: N хитов = drumCount~~
3. ~~Reveal: пусто / +1 / +2 / +3~~
4. ~~Маскот aim+shoot CSS~~
5. ~~`extraFs > 0` → докрутить без bullets и без второго shoot~~ (UI: `fsExtraPhase`)
6. ~~`freeSpinEnd` / outro~~
7. ~~После shoot на доп. FS нет `BT` / `bulletCollect`~~ (math: strip visible+padding; client guard на reveal; assert tool)

**Ассеты этапа:** CSS targets, cat_static, night BG, bigwin (опционально).

**Проверка:** Shift+D → Cat Mafia → `Final Shoot +3 FS` / `Bonus End + Shoot`.

---

### Этап F — Полировка прототипа UI (минимум) ✅

1. ~~Реакции маскота на paw-coins / SW / big win~~ (`clap` / `react` / `wow`)
2. ~~i18n ключи под Cat Mafia (хотя бы EN)~~ — loader cards, buy, game info, target overlays
3. ~~DevButtons end-to-end сценарии~~ — `E2E Full Tour`
4. ~~Storybook stories~~ — `MODE_CAT_MAFIA/bookEvent`
5. ~~Чеклист ручного прогона (§6)~~ — отмечен по реализованному scope

**Проверка:** Shift+D → `E2E Full Tour`; Storybook `:6008` → MODE_CAT_MAFIA.

---

### Этап G — Math (обязательный, после UI-прототипа) 🚧

**Путь:** `third_party/math-sdk/games/0_0_cat_mafia`

1. ~~Завести math game~~ (`0_0_cat_mafia` fork)
2. ~~Board 5×4, 20 paylines, символы `P` / `SW` / `BT`~~
3. ~~Правила: paw / SW+XOR / target pick 8/10/12 / drum / shoot~~
4. ~~Normal / Super / Boost bet modes~~ (без special_spins)
5. ~~Storybook sync → `apps/cat_mafia/src/stories/data/`~~
6. ~~**Доп. FS без пуль:** после `targetShootRound` на +FS нет `BT` / `bulletCollect`~~ (`enforce_feature_symbol_rules` + `tools/assert_no_bullets_on_extra_fs.py`)
7. **Далее:** M5/M6 sim + optimization + RTP ~96% + resample (см. `MATH_COMMANDS.md`, пути на `0_0_cat_mafia`); после M5/M6 — перепроверить assert на publish books

**Быстрый прогон:**

```bash
cd third_party/math-sdk/games/0_0_cat_mafia
export PYTHONPATH=../..:.
$PY smoke_test.py
$PY run_storybook.py && $PY sync_to_web_sdk.py
```

---

## 5. Порядок работ и зависимости

```text
0 (fork daloniil_test → cat_mafia)
 └── A (layout/boot/UI desktop + placeholders)
      └── B (paw→coins + SW base, XOR)
           └── C (target pick + FS start)
                └── D (bullets + drum + SW bonus rules)
                     └── E (final shoot + extra FS)
                          └── F (UI polish / QA)
                               └── G (math-sdk — обязательно)
```

---

## 6. Критерии готовности прототипа (DoD)

UI-прототип (этапы A–F) — реализовано. Math (G) — отдельно.

- [x] Отдельное приложение `cat_mafia` (копия), `daloniil_test` не изменён
- [x] Logo + progress → cards → Click to Play
- [x] Доска 5×4 **desktop**; заглушка **гангстер-кота** справа-снизу (idle)
- [x] Заглушки **барабана/револьвера** и **мишеней** на своих сценах читаются как объекты, не абстрактные кружки без роли
- [x] Boost нет на main; есть в **Autoplay** и **Buy Bonus**
- [x] Base: лапа конвертит ряд (Low×1 / High×2 / Wild×3 / Scatter×3 / Paw=0), мешок появляется
- [x] Пример ряда даёт корректную сумму (`bet=10` → `70` на тестовом ряду)
- [x] Base: SW раскрывается только из win; mult применяется
- [x] Несколько SW: mult перемножаются (`productMult`)
- [x] На одном спине нет одновременной лапы и SW (XOR в handlers + mocks)
- [x] 3+ scatter → сцена 6 мишеней → 8/10/12 FS
- [x] Buy Normal/Super → та же сцена
- [x] В FS нет лапы; есть патроны → барабан ≤6
- [x] Normal vs Super разница по SW видна
- [x] После основных FS — авто-стрельба; +FS возможны
- [x] UI: на доп. FS нет патронов и нет второго shoot (`fsExtraPhase`)
- [x] **Bonus / math:** после стрельбы на доп. FS пули **не выпадают** (`BT` strip на board+padding; client reveal guard; storybook books regenerated)
- [x] Работает в `cat_mafia`; ключевые новые объекты — на CSS/HTML-заглушках; остальное — переиспользованные ассеты из копии
- [x] **Этап G (каркас):** `0_0_cat_mafia` + storybook sync; RTP/optimization — в работе
- [ ] **Этап G (prod):** M5/M6 + optimizer → RTP ~96% + resample для RGS

---

## 7. Вне скоупа первого UI-прохода (A–F)

- **Финальный** арт гангстер-кота / револьвера / мишеней / лапы (минимальные заглушки — **в скоупе**)
- Portrait layout (сначала desktop)
- Локализация всех языков
- Звуковой дизайн под тему
- Performance polish / mobile pixel-perfect
- Правки в исходном `daloniil_test`

**Не вне скоупа проекта:** этап **G — Math** (обязателен после UI-прототипа).

---

## 8. Файлы, которые почти наверняка тронем

Все пути ниже — внутри **`apps/cat_mafia/`** (после Этапа 0).

| Зона         | Файлы (ориентир)                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Fork         | `apps/cat_mafia/*`, `package.json`, workspace filter                                                          |
| Boot         | `LoadingScreen.svelte`, `LoaderCardsHtmlOverlay.svelte`, `GameAssetsLoader.svelte`, `gameEntrance.svelte.ts`  |
| Layout       | `constants.ts`, `config.ts`, `Game.svelte`, HUD layout components                                             |
| Symbols      | `assets.ts`, `SYMBOL_INFO_MAP`, `Symbol.svelte` / `ReelSymbol.svelte`                                         |
| Placeholders | `MascotPlaceholder.svelte`, `RevolverDrumPlaceholder.svelte`, `TargetPlaceholder.svelte`, overlays pick/shoot |
| Bonus UI     | `TargetPickOverlay`, `TargetShootOverlay`, `CoinBagOverlay`, paw-row convert                                  |
| Remove/hide  | `ProgressLadder.svelte` usage, mystery handlers; Boost с main panel                                           |
| Mocks        | `src/stories/data/*`, `DevButtons.svelte`                                                                     |
| Copy         | `src/i18n/messagesMap/en.ts`                                                                                  |

---

## 9. Риски

| Риск                                               | Митигация                                                    |
| -------------------------------------------------- | ------------------------------------------------------------ |
| 5×4 сломает layout-константы                       | Этап A сразу + визуальный прогон                             |
| Конвертация ряда поверх уже сыгравших win-анимаций | Строгий порядок: line/SW сначала, `pawCoinResolve` последним |
| XOR лапа/SW нарушен в mock                         | Валидатор в DevButtons / assert в handler                    |
| `freeSpinTargetPick` нужен wait-for-click          | Promise gate в handler                                       |
| Старые bonus books с ladder/mystery                | Новые mock books; старые не для демо                         |
| Путаница SW vs W                                   | Яркий CSS badge множителя                                    |
| Portrait отложен                                   | Сначала desktop; portrait — отдельный проход после A–F       |

---

## 10. Решения перед стартом (закрыто)

| #   | Вопрос                 | Решение                                                                                                     |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Имя приложения         | **`cat_mafia`**                                                                                             |
| 2   | Детализация заглушек   | **Минимальная** (роль читается, без полировки)                                                              |
| 3   | Math на первом проходе | **Mock books + DevButtons**; полноценный math — отдельный этап после прототипа UI/flow (см. §4 этап G / §7) |
| 4   | Layout                 | Сначала **только desktop**; portrait позже                                                                  |
| 5   | ID лапы                | **`P`**                                                                                                     |
| 6   | Scatter в ряду с лапой | Конвертится в монету **×3** (как Wild) → `3 × bet`                                                          |

---

## 11. Следующий шаг

UI A–F и math-каркас G готовы. Далее для продакшен-математики:

1. Поднять `run.py` num_sim до **1e5** (M5), включить `run_optimization`
2. Resample + format checks; прогнать `tools/assert_no_bullets_on_extra_fs.py` на publish books
3. Прогнать books в `cat_mafia` (Storybook / RGS) и подтянуть RTP
